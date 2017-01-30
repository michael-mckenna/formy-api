module.exports = function (sequelize, DataTypes) {
    return sequelize.define('question', {
        type: {
            type: DataTypes.STRING, // text_field, checkbox, choice_list
            allowNull: false
        },
        // only used for choice_list; POSTGRES only!
        options: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true
        },
        answer: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true
        }
    });
}
