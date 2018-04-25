

require('mocha-as-promised')()
require('js-yaml')

var chai = require('chai')
  , chaiAsPromised = require('chai-as-promised')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')

global.sinon = sinon
global.Q = require('q')
global.expect = chai.expect
chai.use(chaiAsPromised)
chai.use(sinonChai)
chai.should()
