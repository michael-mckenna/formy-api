var Sequelize = require('sequelize');
//env variables are variables set depending on where nodes run and various configurations
//using postgres on production and sqlite on development
var env = process.env.NODE_ENV || 'development'
var sequelize;

if (env === 'production') {
    //connection string
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres'
    });
} else {
    sequelize = new Sequelize(undefined, undefined, undefined, {
        'dialect': 'sqlite',
        'storage': __dirname + '/data/dev-todo-api.sqlite'
    });
}
var db = {};

//tables set up
db.form = sequelize.import(__dirname + "/models/form.js");
db.question = sequelize.import(__dirname + "/models/question.js");
db.user = sequelize.import(__dirname + "/models/user.js");
db.token = sequelize.import(__dirname + "/models/token.js");

db.sequelize = sequelize;
db.Sequelize = Sequelize;

//setting up relationships
db.form.belongsTo(db.user);
db.user.hasMany(db.form);

db.form.hasMany(db.question);
db.question.belongsTo(db.form);

module.exports = db;
