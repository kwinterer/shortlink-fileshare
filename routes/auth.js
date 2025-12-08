const express = require("express");
const passport = require("passport");
const router = express.Router();
const { User } = require("../models");

const { nanoid } = require('nanoid');
// Validate access code
function isValidAccessCode(code) {
  const validCodes = process.env.ACCESS_CODES.split(',').map(c => c.trim());
  return validCodes.includes(code);
}

// Guest login
router.post('/guest', async (req, res) => {
  try {
    const { guestCode } = req.body;
    
    if (guestCode !== process.env.GUEST_CODE) {
      return res.status(401).json({ error: 'Invalid guest code' });
    }

    // Create temporary guest user
    const guestUserName = `Guest-${nanoid(6)}`;
    const guestUser = await User.create({
      type: 'guest',
      name: guestUserName
    });

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
    // Check if this is a new user requiring access code
    if (req.user.isNewUser) {
      // Store profile in session temporarily
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

// Complete registration with access code
router.post('/complete-registration', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const pendingUser = req.session.pendingUser;

    if (!pendingUser) {
      return res.status(400).json({ error: 'No pending registration found' });
    }

    if (!isValidAccessCode(accessCode)) {
      return res.status(401).json({ error: 'Invalid access code' });
    }

    // Create the user
    const user = await User.create({
      type: 'oauth',
      googleId: pendingUser.googleId,
      email: pendingUser.email,
      accessCode: accessCode
    });

    // Clear pending user from session
    delete req.session.pendingUser;

    // Log the user in
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
