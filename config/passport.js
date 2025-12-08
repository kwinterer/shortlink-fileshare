const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../models");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value
              : null;
        let user = await User.findOne({ where: { type:'oauth', googleId: profile.id } });
        if (user) {
          await user.update({
            email: email,
            lastLogin: new Date()
          });
        return done(null, user);
        } 
        else {
          if (!email) {
            return done(new Error("No email found in Google profile"));
          }
          return done(null, {
          isNewUser: true,
          profile:{
            googleId: profile.id,
            email: email,
            isGuest: false,
            lastLogin: new Date(),
          }
          });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  if(user.id){
    done(null, user.id);
  }
  else{
    done(null, false);
  }
});

passport.deserializeUser(async (id, done) => {
  try {
     if (!id) {
      return done(null, false);
    }
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
