var express = require('express');
var router = express.Router();

var Category = require('../models/category');
var Project = require('../models/project');

/* GET home page. */
function languageManager(req, res, next) {
    req.session.lan = req.url;
    Category.getAllCategories(function (err, categories) {
        if (err) throw err;
        if (!categories) {
            categories = [];
        }
        Project.getAllProjects(function (err, projects) {
            if (err) throw err;
            if (!projects) {
                projects = [];
            }
            return res.render('public' + req.session.lan + '/sections', {
                title: 'Nasreddine Bac Ali',
                layout: 'layout',
                language: req.session.lan.replace('/', ''),
                categories: categories,
                projects: projects
            });
        });
    });
}

router.get('/', function (req, res, next) {
    if (!req.session.lan) {
        req.session.lan = '/en';
    }
    res.redirect(req.session.lan);
});

router.get('/fr', languageManager);
router.get('/en', languageManager);

router.get('/project/:id', function (req, res, next) {
    if (!req.session.lan) {
        req.session.lan = '/en';
    }
    Project.getProjectById(req.params.id, function (err, project) {
        if (err) throw err;
        if (!project) {
            return res.redirect('/');
        }
        return res.render('public' + req.session.lan + '/showProject', {
            title: 'Show Project',
            language: req.session.lan.replace('/', ''),
            project: project,
            index: req.query.index
        });
    });
});

router.get('/next/:index', function (req, res, next) {
    var index = req.params.index;
    Project.getAllProjects(function (err, projects) {
        if (err) throw err;
        if (!projects) {
            projects = [];
        }
        index = projects.length + Number(index);
        index %= projects.length;
        return res.redirect('/project/' + projects[index]._id + '?index=' + index);
    });
});

router.get('/*', function (req, res, next) {
    if (req.url !== '/en'
        && req.url !== '/fr'
        && !String(req.url).startsWith('/next')
        && !String(req.url).startsWith('/admin')
        && !String(req.url).startsWith('/project')) {
        return res.redirect('/');
    }
    return next();
});

module.exports = router;
