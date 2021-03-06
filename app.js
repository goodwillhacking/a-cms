/**
 * Module dependencies.
 */
var express = require('express'),
	app = module.exports = express.createServer(),
	mongoose = require('mongoose'),
	db = mongoose.connect('mongodb://spoeken:by-ge@ds033457.mongolab.com:33457/acms'),
	Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId,
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	ensureAuthenticated;
//
var users = [
	{ id: 1, username: 'mathias', password: 'hemmelig', email: 'bob@example.com' },
	{ id: 2, username: 'eivind', password: 'hemmelig', email: 'joe@example.com' }
];
function findById(id, fn) {
	"use strict";
	var idx = id - 1;
	if (users[idx]) {
		fn(null, users[idx]);
	} else {
		fn(new Error('User ' + id + ' does not exist'));
	}
}
function findByUsername(username, fn) {
	"use strict";
	var i,
		len,
		user;
	for (i = 0, len = users.length; i < len; i += 1) {
		user = users[i];
		if (user.username === username) {
			return fn(null, user);
		}
	}
	return fn(null, null);
}
passport.serializeUser(function (user, done) {
	"use strict";
	done(null, user.id);
});
passport.deserializeUser(function (id, done) {
	"use strict";
	findById(id, function (err, user) {
		done(err, user);
	});
});
passport.use(new LocalStrategy(
	function (username, password, done) {
		"use strict";
		// asynchronous verification, for effect...
		process.nextTick(function () {
			findByUsername(username, function (err, user) {
				if (err) { return done(err); }
				if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
				if (user.password !== password) { return done(null, false, { message: 'Invalid password' }); }
				return done(null, user);
			});
		});
	}
));
//
app.configure(function () {
	'use strict';
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.logger('dev'));
	app.use(function (req, res, next) {
		res.locals.url = req.url;
		next();
	});
	app.use(function (req, res, next) {
		res.locals.host = 'http://' + req.headers.host;
		res.locals.query = req.query;
		next();
	});
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({ secret: 'keyboard cat' }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});
app.configure('development', function () {
	'use strict';
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.configure('production', function () {
	'use strict';
	app.use(express.errorHandler());
});
var posts = new Schema({
	author  : ObjectId,
	title   : String,
	slug	: String,
	content : String,
	type	: String,
	buf	 : Buffer,
	date	: Date
});
var post = db.model('post', posts);
/*----------------------------/
	READ
---------------------------*/
function getPostBySlug($slug, $cb) {
	'use strict';
	post.find({slug: $slug}, function (err, data) {
		data.forEach(function (elem, index, array) {
			$cb(elem);
		});
	});
}
function getAllPosts($cb) {
	'use strict';
	post.find({type: "post"}, function (err, data) {
		if (!err) {
			$cb(data);
		} else {
			console.log(err);
		}
	});
}
//
app.get('/', function (req, res) {
	'use strict';
	res.redirect('/blog/');
});
/*----------------------------/
	LOGIN
---------------------------*/
app.get('/logout', function (req, res) {
	'use strict';
	req.logout();
	res.redirect('/');
});
app.get('/login', function (req, res) {
	'use strict';
	res.render('login', {page: {title: "Login"}});
});
app.post('/login',
	passport.authenticate('local', { failureRedirect: '/login?error=Username and/or password incorrect', failureFlash: false }),
	function (req, res) {
		'use strict';
		res.redirect('/admin/posts');
	});
/*----------------------------/
---------------------------*/
//Delete Post by
app.post('/admin/posts/delete', ensureAuthenticated, function (req, res) {
	"use strict";
	console.log(req.body);
	post.remove({_id: req.body.post_id}, function (err) {
		if (!err) {
			res.redirect('admin/posts?warning=The Post was deleted');
		} else {
			res.redirect('admin/posts?warning=Could not delete post. Error: ' + err);
		}
	});
});
/*----------------------------/
---------------------------*/
//Add New
app.get('/admin/posts/addnew', ensureAuthenticated, function (req, res) {
	'use strict';
	res.render('addPost', {page: {title: "Add New Post", content: "Add a new post"}});
});
// Save New
app.post('/admin/posts/addnewtodb', ensureAuthenticated, function (req, res) {
	'use strict';
	if (req.body.title !== "") {
		var instance = new post();
		instance.title = req.body.title;
		instance.slug = req.body.slug;
		instance.content = req.body.content;
		instance.type = "post";
		instance.date = new Date();
		instance.save(function (err) {
			if (!err) {
				res.redirect('admin/posts/addnew?warning=The post was successfully created!');
			} else {
				res.redirect('admin/posts/addnew?warning=Could not create post! Error:' + err);
			}
		});
	} else {
		res.redirect('admin/posts/addnew?warning=Missing title!');
	}
});
/*----------------------------/
---------------------------*/
//Edit
app.get('/admin/posts/edit', ensureAuthenticated, function (req, res) {
	'use strict';
	post.findOne({_id: req.query.post_id}, function (err, data) {
		console.log(data);
		res.render('editPost', {page: {title: "Edit Post", content: "Edit the post"}, post: data});
	});
});
//Save Edited
app.post('/admin/posts/edit/save', ensureAuthenticated, function (req, res) {
	'use strict';
	post.findOne({_id: req.body.post_id}, function (err, data) {
		data.title = req.body.title;
		data.slug = req.body.slug;
		data.content = req.body.content;
		data.save(function (err) {
			if (!err) {
				res.redirect('admin/posts/edit?post_id=' + req.body.post_id + '&warning=The post was successfully updated!');
			} else {
				res.redirect('admin/posts/edit?post_id=' + req.body.post_id + '&warning=Could not save post! Error:' + err);
			}
		});
	});
});
/*----------------------------/
	READ
---------------------------*/
// Show all
app.get('/admin/posts', ensureAuthenticated, function (req, res) {
	'use strict';
	getAllPosts(function (data) {
		res.render('posts', {page: {title: "Posts" }, blogposts: data});
	});
});
app.get('/blog', function (req, res) {
	'use strict';
	getAllPosts(function (data) {
		res.render('blog', {page: {title: "a-cms blog", header: "Welcome to the a-cms blog. It is super effective at teaching you how to use a-cms" }, blogposts: data});
	});
});
//Single
app.get('/blog/:slug', function (req, res) {
	'use strict';
	getPostBySlug(req.params.slug, function (data) {
		res.render('singlepost', {page: data});
	});
});
var port = process.env.PORT || 20095;
app.listen(port);
console.log('Express server listening on port %d in %s mode', port, app.settings.env);
// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to
//   login page.
function ensureAuthenticated(req, res, next) {
	'use strict';
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login?warning=You have to be logged in to access that area');
}