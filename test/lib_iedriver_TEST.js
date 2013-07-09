'use strict';

var expect = require('chai').expect;
var IEDriver = require('../lib/iedriver.js');

describe('dalek-browser-ie IEDriver', function() {

  it('should exist', function(){
    expect(IEDriver).to.be.ok;
  });

});
