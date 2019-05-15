const express = require("express");
const router = express.Router();

const ensureAuthenticated = require("../../tools/ensureAuthenticated");
const CompressTool = require("../../tools/compress");
const deleteImage = require("../../tools/utils").deleteImage;
const sortProjects = require("../../tools/utils").sortProjects;
const upload = require("../../tools/utils").upload;

const Project = require("../../models/project");
const Category = require("../../models/category");

const baseDIR = "admin/dashboard/project/";

const compress = CompressTool();

router.get("/", ensureAuthenticated, async function (req, res, next) {
    let projects = await Project.getAll().catch(() => res.redirect("/admin/project"));

    sortProjects(projects);

    return res.render(baseDIR + "listProject", {
        title: "Projects",
        layout: "dashboardLayout",
        projects
    });
});

router.get("/add", ensureAuthenticated, async function (req, res, next) {
    const categories = await Category.getAll().catch(() => res.redirect("/admin/project"));

    return res.render(baseDIR + "addProject", {
        title: "Add Project",
        layout: "dashboardLayout",
        categories
    });
});

router.get("/show/:id", ensureAuthenticated, async function (req, res, next) {
    let index = req.query.index;
    if (!index || isNaN(index)) {
        index = 0;
    }

    const project = await Project.getById(req.params.id).catch(() => res.redirect("/admin/project"));

    return res.render(baseDIR + "showProject", {
        title: "Show Project",
        layout: "dashboardLayout",
        project,
        index
    });
});

router.post("/postimage", upload, ensureAuthenticated, function (req, res, next) {
    let ID = req.body.ID;
    let filename = req.file.filename;
    compress.begin(filename, {tags: ["project"]}, function (error, image) {
        if (error) {
            throw error;
        }
        res.send({ID, image});
    });
});

router.post("/add", ensureAuthenticated, async function (req, res, next) {
    let title = req.body.title;
    let description = req.body.description;
    let type = req.body.type;
    let category = req.body.category;
    let startDate = req.body.startDate;
    let finishDate = req.body.finishDate;
    let repoGithub = req.body.repoGithub;
    let images = JSON.parse(req.body.images);

    images.sort(function (a, b) {
        const x = a.original_filename.toLowerCase();
        const y = b.original_filename.toLowerCase();
        if (x < y) {
            return -1;
        }
        if (x > y) {
            return 1;
        }
        return 0;
    });

    category = category || [];

    if (Array.isArray(category)) {
        category = category.join(" ");
    }

    let project = new Project({
        title: title,
        description: description,
        type: type
        ,
        category,
        period: {
            start: startDate.split("-").reverse().join("-"),
            finish: finishDate.split("-").reverse().join("-")
        },
        repoGithub,
        creationDate: Date.now(),
        images
    });

    await Project.create(project).catch(() => {
        req.flash("error", "Adding project failed!");
        return res.redirect("/admin/project");
    });

    return res.redirect("/admin/project/show/" + project._id);
});

router.get("/edit/:id", ensureAuthenticated, async function (req, res, next) {
    const project = await Project.getById(req.params.id).catch(() => res.redirect("/admin/project"));
    const categories = await Category.getAll().catch(() => res.redirect("/admin/project"));

    return res.render(baseDIR + "editProject", {
        title: "Edit Project",
        layout: "dashboardLayout",
        categories,
        project
    });
});

router.post("/edit/:id", ensureAuthenticated, async function (req, res, next) {
    let title = req.body.title;
    let description = req.body.description;
    let type = req.body.type;
    let category = req.body.category;
    let startDate = req.body.startDate;
    let finishDate = req.body.finishDate;
    let repoGithub = req.body.repoGithub;
    let images = JSON.parse(req.body.images);

    category = category || [];

    if (Array.isArray(category)) {
        category = category.join(" ");
    }

    let newProject = new Project({
        _id: req.params.id,
        title: title,
        description: description,
        type: type,
        category,
        period: {
            start: startDate.split("-").reverse().join("-"),
            finish: finishDate.split("-").reverse().join("-")
        },
        repoGithub,
        creationDate: Date.now(),
        images: []
    });


    let project = await Project.getById(req.params.id).catch(() => {
        req.flash("error", "Updating project failed!");
        return res.redirect("/admin/project");
    });

    project.images.forEach(function (image) {
        const found = images.find(function (item) {
            return item.secure_url === image.secure_url;
        });
        if (!found) {
            deleteImage(image.public_id);
        } else {
            newProject.images.push(image);
        }
    });

    images.forEach(function (image) {
        const found = newProject.images.find(function (element) {
            return element.secure_url === image.secure_url;
        });
        if (!found) {
            newProject.images.push(image);
        }
    });

    newProject.images.sort(function (a, b) {
        const x = a.original_filename.toLowerCase();
        const y = b.original_filename.toLowerCase();
        if (x < y) {
            return -1;
        }
        if (x > y) {
            return 1;
        }
        return 0;
    });

    project = await Project.update(project._id, newProject).catch(() => {
        req.flash("error", "Updating project failed!");
        return res.redirect("/admin/project");
    });

    return res.redirect("/admin/project/show/" + project._id);
});

router.get("/delete/:id", ensureAuthenticated, async function (req, res, next) {
    const project = await Project.getById(req.params.id).catch(() => res.redirect("/admin/project"));

    await Project.remove(req.params.id).catch(() => {
        req.flash("error", "Deleting project failed!");
        return res.redirect("/admin/project");
    });

    project.images.forEach(function (image) {
        deleteImage(image.public_id);
    });

    return res.redirect("/admin/project");
});

router.get("/*", function (req, res, next) {
    return res.redirect("/admin/project");
});

module.exports = router;
