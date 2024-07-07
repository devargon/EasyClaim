var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login to EasyExpense' });
});

router.get('/expenses', function(req, res, next) {
  res.render('expenses', { title: 'Expenses' });
})

router.get('/claims', function(req, res, next) {
  res.render('claims', { title: 'Claims' });
})

module.exports = router;
