var path = require('path')
var exec = require('child_process').exec
var express = require('express')
var q = require('q')
var getTemplatedTestFile = require('./lib/createTemplate')

var argv = require('optimist')
  .usage('Run a single test or directory fill of tests. Usage: $0 [TEST_PATH]')
  .demand('b')
  .alias('b', 'basedir')
  .describe('b', 'base directory to served by web server. test files will be relative to this path.')
  .demand('t')
  .alias('t', 'template')
  .describe('t', 'path to template to insert test files into')
  .demand('r')
  .alias('r', 'runner')
  .describe('r', 'path to HTML test runner file that runs the mocha tests')
  .default({
    b: '/Users/jergason/itv/Vino',
    t: '/Users/jergason/itv/testament/testRunnerTemplate.hbs',
    r: '/Users/jergason/itv/Vino/test/public/TestRunner.html'
  })
  .argv

var pathToTest = argv._[0]


function handleError(err) {
  console.error("Error running tests:", err.stack)
  process.exit(1)
}

/**
 * Run the tests in pathToTest
 * pathToTest - path to a test file or directory of tests to run
 * baseDir - the path that that will be served by web server. test file paths
 *   will be relative to this path
 * testTemplatePath - the location of the template file to put the tests in
 * testHtmlPath - the location of the mocha test runner file
 **/
function runTests(pathToTest, baseDir, testTemplatePath, testHtmlPath) {
  startServer(baseDir, pathToTest, testTemplatePath, testHtmlPath)
    .then(runPhantom(testHtmlPath))
    .then(reportResults)
    .fail(handleError).done()
}

function startServer(staticFilePath, pathToTestFiles, pathToTestTemplate) {
  // set up server, and magic template
  var server = express()
  var deferred = q.defer()
  var templatedTestFilePromise = getTemplatedTestFile(pathToTestFiles, pathToTestTemplate)
  var templatedTestFile
  var PORT = 3006
  server.use(express.static(staticFilePath))

  // override request for actual test runner url so we send back tepmlated tests
  server.get('test/public/allTests.js', function(req, res) {
    res.set('Content-Type', 'text/javascript')
    res.send(templatedTestFile)
  })


  server.listen(PORT, function () {
    console.log('listening')
    templatedTestFilePromise.then(function(t) {
      templatedTestFile = t
      //console.log('t is', t)
      deferred.resolve()
    }, handleError).done()
  })
  return deferred.promise
}

function runPhantom(testFile) {
  return function() {
    console.log('calling runPhantom')
    var deferred = q.defer()
    var phantom = exec('mocha-phantomjs ' + testFile, function(err, stdout, stderr) {
      deferred.resolve([err, stdout, stderr])
    })
    return deferred.promise
  }
}

function reportResults(results) {
  console.log('results are', results)
  process.exit(0)
}

runTests(pathToTest, argv.b, argv.t, argv.r)
