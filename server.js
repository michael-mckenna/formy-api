var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore'); //refactors logic so we don't have to do any looping
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

/*debugger; used for debugging as a breakpoint
  - must call node debug server.js
  - call cont to continue in terminal
 */
app.get('/', function (req, res) {
    res.send('Formy API Root');
});

// GET /forms?userId:id
app.get('/forms', middleware.requireAuthentication, function (req, res) {
    var query = req.query;
    var where = {
        userId: req.user.get('id')
    };

    // if (query.hasOwnProperty('userId') && typeof query.userId === 'number') {
    //     where.userId = query.userId
    // }

    db.form.findAll({where: where}).then(function (forms) {
        res.json(forms);
    }, function (e) {
        res.status(500).send();
    });
});

// GET /forms/:id
app.get('/forms/:id', middleware.requireAuthentication, function (req, res) {
    var formId = parseInt(req.params.id, 10);

    db.form.findOne({
        where : {
            id: formId,
        }
    }).then(function (form) {
        if (form) {
            form.getQuestions().then(function (questions) {
                var questionsJSON = [];
                questions.forEach(function (question) {
                    questionsJSON.push(question.toJSON());
                });
                var id = form.id.toString();
                var fullJSON =
                {
                    id: questionsJSON
                }
                res.json(fullJSON);
            });
        } else {
            res.status(404).send();
        }
    }, function (e) {
        res.status(500).send();
    });
});

// POST /forms
app.post('/forms', middleware.requireAuthentication, function (req, res) {
    var body = req.body;
    var userId = req.user.get('id') || null;
    var questions = [];

    for(var i = 0; i < body.questions.length; i++) {
        var question = body.questions[i];
        var attributes = {};
        if (question.hasOwnProperty('type')) {
            attributes.type = question.type;
        }

        if (question.hasOwnProperty('options')) {
            attributes.options = question.options;
        }

        if (question.hasOwnProperty('answer')) {
            attributes.answer = question.answer;
        }

        db.question.create(attributes).then(function (question) {
            console.log("Successfully created question")
            questions.push(question);
            console.log('QUESTIONS LENGTH ' + questions.length);
        }), function (e) {
            return res.status(400).json(e);
        }
    }

    db.form.create(body).then(function (form) {
        req.user.addForm(form).then(function () {
            //call reload updates the userId property on the form object
            //if we leave off reload, a call to the userId property will be null
            return form.reload();
        }).then(function (form) {
            form.setQuestions(questions).then(function () {
                return form.reload();
            }).then(function (form) {
                console.log('SUCCESSFULLY ADDED QUESTIONS TO FORM');
                form.getQuestions().then(function (questions) {
                    console.log('ASSOCIATED QUESTIONS LENGTH: ' + questions.length);
                });
                res.json(form.toJSON());
            });
        });
    }, function (e) {
        res.status(400).json(e);
    });

});

// DELETE /todos/:id
app.delete('/forms/:id', middleware.requireAuthentication, function (req, res) {
    var id = parseInt(req.params.id, 10);
    // var matchedTodo = _.findWhere(todos, {id: id});
    var userId = req.user.get('id') || null;

    db.form.destroy({
        where: {
            id: id,
            userId: req.user.get('id')
        }
    }).then(function (rowsDeleted) {
        if (rowsDeleted == 0) {
            res.status(404).json({
                error: 'No todo with id'
            })
        } else {
            res.status(204).send(); //success
        }
    }), function () {
        res.status(500).send();
    }

});

// PUT /forms/:id
app.put('/forms/:id', middleware.requireAuthentication, function (req, res) {
    var id = parseInt(req.params.id, 10);
    var attributes = {};
    var body = req.body;

    if (body.hasOwnProperty('questions')) {
        attributes.questions = body.questions;
    }

    db.form.findOne({
        where: {
            id: id,
            userId: req.user.get('id') || null
        }
    }).then(function (form) {
        if (form) {
            form.update(attributes).then(function (form) {
                res.json(form.toJSON());
            }, function (e) {
                res.status(400).json(e);
            });
        } else {
            res.status(404).send();
        }
    }, function () {
        res.status(500).send();
    });
});

// POST /users
app.post('/users', function (req, res) {
    var body = req.body;

    db.user.create(body).then(function (user) {
        res.json(user.toPublicJSON());
    }, function (e) {
        res.status(400).json(e);
    });
})

// POST /users/login (example of custom actions)
app.post('/users/login', function (req, res) {
    var body = req.body;
    var userInstance;

    db.user.authenticate(body).then(function (user) {
        var token = user.generateToken('authentication');
        userInstance = user;
        return db.token.create({
            token: token
        });
        // if (token) {
        //     res.header('Auth', token).json(user.toPublicJSON());
        // } else {
        //     res.status(401).send();
        // }
    }).then(function (tokenInstance) {
        //runs after token create finishes
        res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
    }).catch(function () {
        res.status(401).send();
    });
});

// DELETE /users/login (log out)
app.delete('/users/login', middleware.requireAuthentication, function (req, res) {
    req.token.destroy().then(function () {
        res.status(204).send();
    }).catch(function () {
        res.status(500).send();
    });
});

db.sequelize.sync().then(function () {
    app.listen(PORT, function() {
        console.log('Listening on ' + PORT);
    });
});
