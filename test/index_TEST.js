'use strict';

var expect = require('chai').expect;
var IEDriver = require('../index');

describe('dalek-browser-ie', function() {

  it('should get default webdriver port', function(){
    expect(IEDriver.port).to.equal(5555);
  });

});
