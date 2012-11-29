define(['buffer',
        'chai'],
function(buffer, chai) {
  var expect = chai.expect;

  describe("buffer", function() {

    it('should export Buffer constructor', function() {
      expect(buffer.Buffer).to.exist;
      expect(buffer.Buffer).to.be.a('function');
    });

    it('should export Buffer via module', function() {
      expect(buffer).to.equal(buffer.Buffer);
    });

  });
  
  describe("Buffer with string subject", function() {
    var buf = new buffer.Buffer('JavaScript');
    
    it('should have correct length', function() {
      expect(buf.length).to.equal(10)
    });
    it('should convert to hex string', function() {
      console.log('hex: ' + buf.toString('hex'))
      expect(buf.toString('hex')).to.equal('4a617661536372697074')
    });
    it('should convert to base64 string', function() {
      // FIXME:
      //console.log('base64: ' + buf.toString('base64'))
      //expect(buf.toString('hex')).to.equal('SmF2YVNjcmlwdA==')
    });
  });

  return { name: "test.buffer" }
});
