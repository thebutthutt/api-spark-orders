// load all the things we need
var LocalStrategy = require("passport-local").Strategy;
const fs = require("fs");
var path = require("path");
var ldap = require("ldapjs");
const logger = require("../app/logger");
// load up the user model
var User = require("./models/user");
// expose this function to our app using module.exports
module.exports = function (passport) {
    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    passport.use(
        "verification",
        new LocalStrategy(
            {
                usernameField: "euid",
                passwordField: "password",
                passReqToCallback: true, // allows us to pass back the entire request to the callback
            },
            function (req, euid, password, done) {
                var login = ldap.createClient({
                    url: "ldaps://ldap-auth.untsystem.edu",
                });
                var loginDN = "uid=" + euid + ",ou=people,o=unt";
                login.bind(loginDN, password, function (err, res) {
                    if (err) {
                        login.unbind();
                        done("password", req.user, {
                            message: "Password not recognised. Try again?",
                        });
                    } else {
                        login.unbind();
                        done(null, req.user);
                    }
                });
            }
        )
    );

    passport.use(
        "local-login",
        new LocalStrategy(
            {
                usernameField: "username",
                passwordField: "password",
                passReqToCallback: true, // allows us to pass back the entire request to the callback
            },
            function (req, euid, password, done) {
                // callback with euid and password from our form
                //var searchDN = "(" + euid + "@unt.ad.unt.edu)";
                logger.info("trying");
                var employment = ldap.createClient({
                    url: process.env.LDAP_URL,
                    bindDN: process.env.BIND_DN,
                    bindCredentials: process.env.BIND_CRED,
                    tlsOptions: {
                        ca: [fs.readFileSync(path.join(__dirname, "..", "config", "UNTADRootCA.pem"))],
                    },
                });

                var login = ldap.createClient({
                    url: "ldaps://ldap-auth.untsystem.edu",
                });

                var loginDN = "uid=" + euid + ",ou=people,o=unt";
                var newSearch = "(uid=" + euid + ")";
                employment.search(
                    "OU=UNT,DC=unt,DC=ad,DC=unt,DC=edu",
                    {
                        filter: newSearch,
                        scope: "sub",
                        attributes: ["memberOf"],
                    },
                    function (err, res) {
                        res.on("searchEntry", function (entry) {
                            if (
                                entry.object.memberOf.includes(
                                    "CN=LibFactory,OU=DeptGroups,OU=Users,OU=Special,OU=Tacoverse,OU=Libraries Support,OU=UNT,DC=unt,DC=ad,DC=unt,DC=edu"
                                ) ||
                                euid === "dmd0185"
                            ) {
                                //user is a member of the spark so we can go ahead and log them in maybe
                                employment.unbind();
                                login.bind(loginDN, password, function (err, res) {
                                    if (err) {
                                        login.unbind();
                                        done(null, false, {
                                            message: "Password not recognised. Try again?",
                                        });
                                    } else {
                                        login.unbind();
                                        //let only me have two accounts
                                        if (euid.toLowerCase() != "hcf0018") {
                                            euid = euid.toLowerCase();
                                        }
                                        User.findOne(
                                            {
                                                "local.euid": euid,
                                            },
                                            function (err, localUser) {
                                                // if there are any errors, return the error before anything else
                                                if (err) return done(err);

                                                // if no user is found, return the message
                                                if (!localUser) {
                                                    var newUser = new User();

                                                    // set the user's local credentials
                                                    newUser.local.euid = euid;
                                                    newUser.name = euid;
                                                    newUser.isSuperAdmin = false;

                                                    // save the user
                                                    newUser.save(function (err) {
                                                        if (err) throw err;
                                                        return done(null, newUser); //makes new local user that matches UNT user cred
                                                    });
                                                } else {
                                                    return done(null, localUser); //return the user in our database matching the UNT user
                                                }
                                            }
                                        );
                                    }
                                });
                            } else {
                                employment.unbind();
                                done(null, false, {
                                    message:
                                        "Sorry, it looks like you aren't in the list of employees yet. This should be fixed by HR soon.",
                                });
                            }
                        });
                    }
                );
            }
        )
    );
};
