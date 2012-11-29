define(function() {

  // https://github.com/joyent/node/blob/master/lib/buffer.js
  // https://github.com/toots/buffer-browserify
  // https://github.com/coolaj86/browser-buffer

  function Buffer(subject, encoding) {
    var type;
    
    switch (type = typeof subject) {
      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;
      
      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }
    
    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;
    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }
    
    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0, len = this.length; i < len; i++) {
        this.parent[i + this.offset] = subject[i];
      }
    } else if (type == 'string') {
      this.length = this.write(subject, 0, encoding);
    }
  }
  
  Buffer.prototype.write = function(string, offset, length, encoding) {
    // write(string, offset = 0, length = buffer.length - offset, encoding = 'utf8')
    
    if (isFinite(offset)) {
      if (!isFinite(length)) {
        encoding = length;
        length = undefined;
      }
    }
    
    offset = +offset || 0;
    var remaining = this.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = +length;
      if (length > remaining) {
        length = remaining;
      }
    }
    encoding = String(encoding || 'utf8').toLowerCase();
    
    var ret;
    switch (encoding) {
      case 'hex':
        ret = this.parent.hexWrite(string, this.offset + offset, length);
        break;
    
      case 'utf8':
      case 'utf-8':
        ret = this.parent.utf8Write(string, this.offset + offset, length);
        break;
    
      case 'ascii':
        ret = this.parent.asciiWrite(string, this.offset + offset, length);
        break;
        
      case 'binary':
        // TODO:
        ret = this.parent.binaryWrite(string, this.offset + offset, length);
        break;
    
      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        ret = this.parent.base64Write(string, this.offset + offset, length);
        break;
    
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        // TODO:
        ret = this.parent.ucs2Write(string, this.offset + offset, length);
        break;
    
      default:
        throw new Error('Unknown encoding: ' + encoding);
    }
    
    return ret;
  }
  
  Buffer.prototype.toString = function(encoding, start, end) {
    // toString(encoding, start = 0, end = buffer.length)
    
    encoding = String(encoding || 'utf8').toLowerCase();
  
    if (typeof start == 'undefined' || start < 0) {
      start = 0;
    } else if (start > this.length) {
      start = this.length;
    }
  
    if (typeof end == 'undefined' || end > this.length) {
      end = this.length;
    } else if (end < 0) {
      end = 0;
    }
  
    start = start + this.offset;
    end = end + this.offset;
  
    switch (encoding) {
      case 'hex':
        return this.parent.hexSlice(start, end);
  
      case 'utf8':
      case 'utf-8':
        return this.parent.utf8Slice(start, end);
  
      case 'ascii':
        return this.parent.asciiSlice(start, end);
  
      case 'binary':
        // TODO:
        return this.parent.binarySlice(start, end);
  
      case 'base64':
        return this.parent.base64Slice(start, end);
  
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        // TODO:
        return this.parent.ucs2Slice(start, end);
  
      default:
        throw new Error('Unknown encoding: ' + encoding);
    }
  }
  
  Buffer.isEncoding = function(encoding) {
    switch (encoding && encoding.toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'binary':
      case 'base64':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
      case 'raw':
        return true;
  
      default:
        return false;
    }
  }
  
  Buffer.isBuffer = function(b) {
    return b instanceof Buffer;
  }
  
  
  function SlowBuffer(size) {
    this.length = size;
  }
  SlowBuffer.prototype.__proto__ = Buffer.prototype;
  
  SlowBuffer.prototype.hexWrite = function(string, offset, length) {
    offset = +offset || 0;
    var remaining = this.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = +length;
      if (length > remaining) {
        length = remaining;
      }
    }
  
    // must be an even number of digits
    var strLen = string.length;
    if (strLen % 2) {
      throw new Error('Invalid hex string');
    }
    if (length > strLen / 2) {
      length = strLen / 2;
    }
    for (var i = 0; i < length; i++) {
      var byte = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(byte)) throw new Error('Invalid hex string');
      this[offset + i] = byte;
    }
    return i;
  };
  
  SlowBuffer.prototype.utf8Write = function(string, offset, length) {
    return blitBuffer(convertUTF8ToBytes(string), this, offset, length);
  };
  
  SlowBuffer.prototype.asciiWrite = function(string, offset, length) {
    return blitBuffer(convertAsciiToBytes(string), this, offset, length);
  };
  
  SlowBuffer.prototype.base64Write = function(string, offset, length) {
    return blitBuffer(convertBase64ToBytes(string), this, offset, length);
  };
  
  SlowBuffer.prototype.hexSlice = function(start, end) {
    var len = this.length;
  
    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;
  
    var out = '';
    for (var i = start; i < end; i++) {
      out += toHex(this[i]);
    }
    return out;
  }
  
  SlowBuffer.prototype.utf8Slice = function() {
    var bytes = Array.prototype.slice.apply(this, arguments);
    var res = '';
    var tmp = '';
    var i = 0;
    while (i < bytes.length) {
      if (bytes[i] <= 0x7F) {
        res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
        tmp = '';
      } else {
        tmp += "%" + bytes[i].toString(16);
      }
      i++;
    }
  
    return res + decodeUtf8Char(tmp);
  }
  
  SlowBuffer.prototype.asciiSlice = function() {
    var bytes = Array.prototype.slice.apply(this, arguments);
    var ret = '';
    for (var i = 0; i < bytes.length; i++) {
      ret += String.fromCharCode(bytes[i]);
    }
    return ret;
  }
  
  SlowBuffer.prototype.base64Slice = function (start, end) {
    var bytes = Array.prototype.slice.apply(this, arguments);
    // FIXME: Implement base64 support
    return require("base64-js").fromByteArray(bytes);
  }
  
  SlowBuffer.byteLength = function(str, encoding) {
    switch (encoding || 'utf8') {
      case 'hex':
        return str.length / 2;
  
      case 'utf8':
      case 'utf-8':
        return convertUTF8ToBytes(str).length;
  
      case 'ascii':
        return str.length;
  
      case 'base64':
        return convertBase64ToBytes(str).length;
  
      default:
        throw new Error('Unknown encoding: ' + encoding);
    }
  }
  Buffer.byteLength = SlowBuffer.byteLength;
  
  
  Buffer.poolSize = 8 * 1024;
  var pool;
  
  function allocPool() {
    pool = new SlowBuffer(Buffer.poolSize);
    pool.used = 0;
  }
  
  
  function toHex(n) {
    if (n < 16) return '0' + n.toString(16);
    return n.toString(16);
  }
  
  function blitBuffer(src, dst, offset, length) {
    var pos, i = 0;
    while (i < length) {
      if ((i + offset >= dst.length) || (i >= src.length))
        break;
  
      dst[i + offset] = src[i];
      i++;
    }
    return i;
  }
  
  // http://stackoverflow.com/questions/1240408/reading-bytes-from-a-javascript-string
  function convertUTF8ToBytes(str) {
    var ba = [];
    for (var i = 0, len = str.length; i < len; i++) {
      if (str.charCodeAt(i) <= 0x7F) {
        ba.push(str.charCodeAt(i));
      } else {
        var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
        for (var j = 0; j < h.length; j++)
          ba.push(parseInt(h[j], 16));
      }
    }
    return ba;
  }
  
  function convertAsciiToBytes(str) {
    var ba = []
    for (var i = 0, len = str.length; i < len; i++) {
      // Node's code seems to be doing this and not & 0x7F...
      ba.push(str.charCodeAt(i) & 0xFF);
    }
    return ba;
  }
  
  function convertBase64ToBytes(str) {
    // FIXME: Implement base64 support
    return require("base64-js").toByteArray(str);
  }
  
  function isArrayIsh(subject) {
    return Array.isArray(subject) || Buffer.isBuffer(subject) ||
           subject && typeof subject === 'object' &&
           typeof subject.length === 'number';
  }


  return Buffer;
});
