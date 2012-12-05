
/**
 * Module dependencies.
 */

var express = require('express')
  , gzippo = require('gzippo')
  , routes = require('./routes')
  , crypto = require('crypto')
  , moment = require('moment')
  , cluster = require('cluster')
  , os = require('os')
  , db = require('mongojs').connect('trev', ['rep', 'user']);

var conf = {
  salt: 'rdasSDAg'
};

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  //app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'wasdsafeAD' }));
  app.use(gzippo.staticGzip(__dirname + '/public'));
  app.use(app.router);
  
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  //app.use(express.errorHandler()); 
});

app.helpers({
  moment: moment
});

app.dynamicHelpers({
  user: function(req, res) {
    return req.session.user;
  },
  flash: function(req, res) {
    return req.flash();
  }
});
// Routes

function isUser(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    next(new Error('You must be user to access this page'));
  }
}

// app.error(function(err, req, res, next){
//   if (err instanceof NotFound) {
//     res.render('error/404.jade', { title: 'Not found 404' });
//   } else {
//     res.render('error/500.jade', { title: 'Error', error: err });
//   }
// });

// Listing
app.get('/', function(req, res) {
  db.rep.find(function(err, reps) {
    if (!err && reps) {
      res.render('index.jade', { title: '[Team name]', repList: reps }); 
    }
  });
});

app.get('/rep/add', isUser, function(req, res) {
  db.rep.find(function(err, reps) {
    if (!err && reps) {
      res.render('add.jade', { title: '[Team Name] - Add a rep', repList: reps }); 
    }
  });
});

app.post('/rep/add', isUser, function(req, res) {
  var values = {
      repName: req.body.name
    , teamName: req.body.team
    , repOpp: req.body.opp
    , repPace: req.body.pace
    , repChurn: req.body.churn
    , teamLead: { 
        username: req.session.user.user
      }
    , created: new Date()
    , modified: new Date()
  };

  db.rep.insert(values, function(err, rep) {
    console.log(err, rep);
    res.redirect('/');
  });
});
// Show rep
// Route param pre condition
app.param('repid', function(req, res, next, id) {
  if (id.length != 24) throw new NotFound('The rep id is not having correct length');

  db.rep.findOne({ _id: db.ObjectId(id) }, function(err, rep) {
    if (err) return next(new Error('Make sure you provided correct rep id'));
    if (!rep) return next(new Error('Rep loading failed'));
    req.rep = rep;
    next();
  });
});

app.get('/reps/edit', isUser, function(req, res) {
  db.rep.find(function(err, reps) {
    if (!err && reps) {
      res.render('edit-reps.jade', { title: '[Team Name] - Edit reps', repList: reps }); 
    }
  });
});

app.get('/rep/edit/:repid', isUser, function(req, res) {
  db.rep.find(function(err, reps) {
    if (!err && reps) {
      res.render('edit-rep.jade', { title: '[Team Name] - ' + req.rep.repName, rep: req.rep, repList: reps }); 
    }
  });
});

// app.post('/post/edit/:postid', isUser, function(req, res) {
//   db.post.update({ _id: db.ObjectId(req.body.id) }, { 
//     $set: { 
//         subject: req.body.subject
//       , body: req.body.body
//       , tags: req.body.tags.split(',')
//       , modified: new Date()
//     }}, function(err, post) {
//       if (!err) {
//         req.flash('info', 'Post has been sucessfully edited');
//       }
//       res.redirect('/');
//     });
// });

app.get('/rep/delete/:repid', isUser, function(req, res) {
  db.rep.remove({ _id: db.ObjectId(req.params.repid) }, function(err, field) {
    if (!err) {
      req.flash('error', 'Rep has been deleted');
    } 
    res.redirect('/');
  });
});

app.get('/rep/:repid', function(req, res) {
  res.render('show.jade', { 
    title: 'Showing rep - ' + req.rep.repName,
    rep: req.rep 
  });
});

// Add comment
// app.post('/post/comment', function(req, res) {
//   var data = {
//       name: req.body.name
//     , body: req.body.comment
//     , created: new Date()
//   };
//   db.post.update({ _id: db.ObjectId(req.body.id) }, {
//     $push: { comments: data }}, { safe: true }, function(err, field) {
//       if (!err) {
//         req.flash('success', 'Comment added to post');
//       }
//       res.redirect('/'); 
//   });
// });

// Login
app.get('/login', function(req, res) {
  res.render('login.jade', {
    title: 'Login user'
  });
});

app.get('/logout', isUser, function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

app.post('/login', function(req, res) {
  var select = {
      user: req.body.username
    , pass: crypto.createHash('sha256').update(req.body.password + conf.salt).digest('hex')
  };

  db.user.findOne(select, function(err, user) {
    if (!err && user) {
      // Found user register session
      req.session.user = user;
      res.redirect('/');
    } else {
      // User not found lets go through login again
      res.redirect('/login');
    }
    
  });
});

// //The 404
// app.get('/*', function(req, res){
//     throw new NotFound;
// });

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

/**
 * Adding the cluster support
 */
if (cluster.isMaster) {
  // Be careful with forking workers
  for (var i = 0; i < os.cpus().length * 1; i++) {
    var worker = cluster.fork();
  }
} else {
  // Worker processes
  app.listen(3000);  
}


