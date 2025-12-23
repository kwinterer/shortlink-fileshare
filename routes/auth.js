const express = require("express");
const passport = require("passport");
const router = express.Router();
const { User, AccessCode } = require("../models");

const { nanoid } = require('nanoid');
const accessCode = require("../models/accessCode");

// Guest login
router.post('/guest', async (req, res) => {
  try {
    const { guestCode } = req.body;

    const guestCodeRecord = await AccessCode.findOne({
      where: {
        id: guestCode,
        type: 'GuestCode',
        userId: null
      }
    });

    const guestUserName = `Guest-${nanoid(6)}`;
    const guestUser = await User.create({
      type: 'guest',
      name: guestUserName
    });

    await guestCodeRecord.setUser(guestUser);

    req.login(guestUser, (err) => {
      if (err) {
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
    console.error('Guest login error:', error);
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
      return res.redirect('/?requireAccessCode=true');
    } 
    req.login(req.user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.redirect('/?error=login_failed');
      }
      res.redirect('/');
    });
  },
);

router.post('/complete-registration', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const pendingUser = req.session.pendingUser;

    if (!pendingUser) {
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
      return res.status(401).json({ error: 'Invalid access code' });
    }

    const user = await User.create({
      type: 'oauth',
      googleId: pendingUser.googleId,
      email: pendingUser.email
    });

    await accessCodeRecord.setUser(user);

    delete req.session.pendingUser;

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/logout', (req, res) => {
  const isGuest = req.user?.type === 'guest';
  const userId = req.user?.id;

  req.logout((err) => {
    if (err) {
      console.error('Passport logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    const deleteGuest = async () => {
      if (isGuest && userId) {
        try {
          await User.destroy({ where: { id: userId } });
          console.log('Guest user deleted:', userId);
        } catch (error) {
          console.error('Failed to cleanup guest user:', error);
        }
      }
    };

    deleteGuest().then(() => {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destroy error:', destroyErr);
          return res.status(500).json({ error: 'Session destroy failed' });
        }

        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });

        console.log('Logout complete - session destroyed, cookie cleared');
        
        res.redirect('/');
      });
    });
  });
});

router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        type: req.user.type
      },
    });
  } else {
    res.json({ 
      authenticated: false ,
      requireAccessCode: req.session && req.session.pendingUser ? true : false
      });
  }
});

module.exports = router;
