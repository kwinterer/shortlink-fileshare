const express = require("express");
const passport = require("passport");
const router = express.Router();
const { User, AccessCode } = require("../models");

const { nanoid } = require('nanoid');
const accessCode = require("../models/accessCode");

router.post('/guest', async (req, res) => {
  try {
    const { guestCode } = req.body;

    req.log.info({body: req.body, accessCode: guestCode }, `Got /auth/guest request with guest code ${guestCode}`);

    const guestCodeRecord = await AccessCode.findOne({
      where: {
        id: guestCode,
        type: 'GuestCode',
        userId: null
      }
    });
    req.log.info({body: req.body, accessCode: guestCode, accessCodeRecord: guestCodeRecord}, `Got accessCode record: ${guestCodeRecord}`);

    const guestUserName = `Guest-${nanoid(6)}`;
    const guestUser = await User.create({
      type: 'guest',
      name: guestUserName
    });

    await guestCodeRecord.setUser(guestUser);

    req.log.info({body: req.body, accessCode: guestCode, accessCodeRecord: guestCodeRecord, user: guestUser}, `Created guest user: ${guestUser}`);

    req.login(guestUser, (err) => {
      if (err) {
        req.log.error({body: req.body, error: err}, `Error: ${err}`);
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ 
        success: true,
        user: {
          id: guestUser.id,
          name: guestUser.name,
          isGuest: true
        }
      });
    });
  } catch (error) {
    req.log.error({body: req.body, error:error}, `Guest login error:: ${error}`);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});


router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failed",
    session: false
  }),
  (req, res) => {
    if (req.user.isNewUser) {
      req.session.pendingUser = req.user.profile;
      req.log.info({body: req.body, user: req.user }, `Got /google/callback request with req.user.isNewUser == true. Redirect to /?requireAccessCode=true`);
      return res.redirect('/?requireAccessCode=true');
    } 
    req.login(req.user, (err) => {
      if (err) {
        //console.error('Login error:', err);
        req.log.error({body: req.body, user: req.user, error: err}, `Login error: ${err}`);
        return res.redirect('/?error=login_failed');
      }
      req.log.info({body: req.body, user: req.user }, `Login successful`);
      res.redirect('/');
    });
  },
);

router.post('/complete-registration', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const pendingUser = req.session.pendingUser;
    
    req.log.info({body: req.body, pendingUser: pendingUser, accessCode: accessCode}, `Got /complete-registration with pendingUser: ${pendingUser}`);

    if (!pendingUser) {
      req.log.warn({body: req.body, pendingUser: pendingUser, accessCode: accessCode }, `No pendingUser found in session: ${req.session}`);
      return res.status(400).json({ error: 'No pending registration found' });
    }
    const accessCodeRecord = await AccessCode.findOne({
      where: {
        id: accessCode,
        type: 'AccessCode',
        userId: null
      }
    });

    if (accessCodeRecord === null) {
      req.log.warn({body: req.body, pendingUser: pendingUser, accessCode: accessCode, accessCodeRecord: accessCodeRecord}, `AccessCode ${accessCode} not found in database`);
      return res.status(401).json({ error: 'Invalid access code' });
    }

    const user = await User.create({
      type: 'oauth',
      googleId: pendingUser.googleId,
      email: pendingUser.email
    });

    await accessCodeRecord.setUser(user);

    req.log.info({body: req.body, pendingUser: pendingUser, accessCode: accessCode, accessCodeRecord: accessCodeRecord, user: user}, `Created new User and updated accessCode to new user: ${user}`);

    delete req.session.pendingUser;

    req.login(user, (err) => {
      if (err) {
        req.log.error({body: req.body, pendingUser: pendingUser, accessCode: accessCode, accessCodeRecord: accessCodeRecord, user: user, error: err}, `Login error for new user: ${err}`);
        return res.status(500).json({ error: 'Login failed' });
      }
      req.log.info({body: req.body, pendingUser: pendingUser, accessCode: accessCode, accessCodeRecord: accessCodeRecord, user: user}, `Logged in new user: ${user}`);
      res.json({ 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          isGuest: false
        }
      });
    });
  } catch (error) {
    req.log.error({body: req.body, pendingUser: pendingUser, accessCode: accessCode, error: error}, `Registration error: ${error}`);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/logout', (req, res) => {
  const isGuest = req.user?.type === 'guest';
  const userId = req.user?.id;

  req.log.info({body: req.body, user: userId, isGuest: isGuest}, `Got /logout with user: ${userId}`);

  req.logout((err) => {
    if (err) {
      req.log.error({body: req.body, user: userId, isGuest: isGuest, error: err}, `Passport logout error: ${err}`);
      return res.status(500).json({ error: 'Logout failed' });
    }

    const deleteGuest = async () => {
      if (isGuest && userId) {
        try {
          await User.destroy({ where: { id: userId } });
          req.log.info({body: req.body, user: userId, isGuest: isGuest}, `Guest user deleted: ${userId}`);
        } catch (error) {
          req.log.error({body: req.body, user: userId, isGuest: isGuest, error: error}, `Failed to cleanup guest user: ${error}`);
        }
      }
    };

    deleteGuest().then(() => {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          req.log.error({body: req.body, user: userId, isGuest: isGuest, error: destroyErr}, `Session destroy error: ${destroyErr}`);
          return res.status(500).json({ error: 'Session destroy failed' });
        }

        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });

        req.log.info({body: req.body, user: userId, isGuest: isGuest}, `Logout complete - session destroyed, cookie cleared`);
        res.redirect('/');
      });
    });
  });
});

router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    req.log.info({body: req.body, user: req.user, session: req.session}, `User is authenticated: ${req.user}`);
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        type: req.user.type
      },
    });
  } else {
    req.log.info({body: req.body, user: req.user, session: req.session}, `User is not authenticated: ${req.user}`);
    res.json({ 
      authenticated: false ,
      requireAccessCode: req.session && req.session.pendingUser ? true : false
      });
  }
});

module.exports = router;
