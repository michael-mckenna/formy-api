var cryptojs = require('crypto-js');
module.exports = function (db) {
    //not able to make requests unless the token exists in the database
    //even if it's a valid token, doesn't work unless it is actually saved
    return {
        requireAuthentication: function (req, res, next) {
            var token = req.get('Auth') || '';

            db.token.findOne({
                where: {
                    tokenHash: cryptojs.MD5(token).toString()
                }
            }).then(function (tokenInstance) {
                if (!tokenInstance) {
                    throw new Error();
                }

                req.token = tokenInstance;
                return db.user.findByToken(token);
            }).then(function (user) {
                req.user = user;
                next();
            }).catch(function () {
                res.status(401).send();
            });
        }
    };
};
