var bcrypt = require('bcrypt');
var _ = require('underscore');
var cryptojs = require('crypto-js');
var jwt = require('jsonwebtoken');

module.exports = function (sequelize, DataTypes) {
    var user = sequelize.define('user', {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        salt: {
            type: DataTypes.STRING
        },
        password_hash: {
            type: DataTypes.STRING
        },
        password: {
            type: DataTypes.VIRTUAL, //doesn't get stored in database but is accessible
            allowNull: false,
            validate: {
                len: [7, 100]
            },
            set: function (value) {
                var salt = bcrypt.genSaltSync(10);
                var hashedPassword = bcrypt.hashSync(value, salt);

                this.setDataValue('password', value);
                this.setDataValue('salt', salt);
                this.setDataValue('password_hash', hashedPassword);
            }
        }
    }, {
        hooks: {
            beforeValidate: function (user, options) {
                if (typeof user.email === 'string') {
                    user.email = user.email.toLowerCase();
                }
            }
        },
        classMethods: {
            authenticate: function (body) {
                return new Promise(function(resolve, reject) {

                    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
                        return reject();
                    }

                    user.findOne({
                        where: {
                            email: body.email
                        }
                    }).then(function (user) {
                        if (!user || !bcrypt.compareSync(body.password, user.get('password_hash'))) {
                            return reject(); //authnetication is possible but failed
                        }

                        resolve(user);
                        // res.json(user.toPublicJSON());
                    }, function (e) {
                        reject();
                    });
                });
            },
            findByToken: function (token) {
                return new Promise(function (resolve, reject) {
                    try {
                        var decodedJWT = jwt.verify(token, 'qwerty098'); //verifies that a token hasn't been modified and that it is indeed valid
                        var bytes = cryptojs.AES.decrypt(decodedJWT.token, 'abc123!@#!');
                        var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));

                        user.findById(tokenData.id).then(function (user) {
                            if (user) {
                                resolve(user);
                            } else {
                                reject();
                            }
                        }), function (e) {
                            reject();
                        }
                    } catch (e) {
                        reject(); //cancels middleware and private code doesn't run
                    }
                });
            }
        },
        instanceMethods: {
            toPublicJSON: function () {
                var json = this.toJSON();
                return _.pick(json, 'id', 'email', 'createdAt', 'updatedAt'); //prevents password from being displayed in json
            },
            generateToken: function (type) {
                if (!_.isString(type)) {
                    return undefined;
                }

                try {
                    var stringData = JSON.stringify({
						id: this.get('id'),
						type: type
					});
                    var encryptedData = cryptojs.AES.encrypt(stringData, 'abc123!@#!').toString();
                    var token = jwt.sign({
                        token: encryptedData
                    }, 'qwerty098');

                    return token;
                } catch (e) {
                    console.error(e);
                    return undefined;
                }
            }
        }
    });
    return user;
};
