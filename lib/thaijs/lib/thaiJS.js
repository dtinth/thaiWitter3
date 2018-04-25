(function() {
  var ThaiJS, Token;
  Token = (function() {
    function Token(text, index) {
      this.text = text;
      this.index = index;
    }
    Token.prototype.test = function(tester) {
      if (tester instanceof Function) {
        return tester(this);
      } else if (tester instanceof RegExp) {
        return tester.test(this.text);
      } else {
        return tester === this.text;
      }
    };
    return Token;
  })();
  module.exports = ThaiJS = (function() {
    var WORD, WS;
    ThaiJS.compile = function(code) {
      var compiler, index, line, lineMap, place, tokens, _i, _len, _len2, _ref;
      tokens = this.tokenize(code);
      compiler = new this(tokens);
      lineMap = [];
      index = 0;
      _ref = code.split('\n');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        lineMap.push(index);
        index += line.length + 1;
      }
      try {
        return compiler.compile();
      } catch (e) {
        if (compiler.index < compiler.tokens.length) {
          for (line = 0, _len2 = lineMap.length; line < _len2; line++) {
            index = lineMap[line];
            if (compiler.tokens[compiler.index].index >= index) {
              place = ' at line ' + (line + 1) + ' col ' + (compiler.tokens[compiler.index].index - index + 1);
            }
          }
        } else {
          place = ' at eof';
        }
        throw new Error(e.message + place);
      }
    };
    ThaiJS.tokenize = function(code) {
      var match, re, tokens;
      re = /@[\w]+|@\[|@@[\w]+|@@\[|\w+|\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*'|\/(?:\\[\s\S]|[^\n\/])*\/|::|\s+|\S/g;
      tokens = [];
      while ((match = re.exec(code)) !== null) {
        tokens.push(new Token(match[0], match.index));
      }
      return tokens;
    };
    WS = /^\s+$/;
    WORD = /^\w+$/;
    function ThaiJS(tokens) {
      this.tokens = tokens;
    }
    ThaiJS.prototype.compile = function() {
      var output;
      this.catStack = [];
      this.classStack = [];
      this.index = 0;
      output = this.parse();
      if (this.index < this.tokens.length) {
        throw new Error("end-of-file expected");
      }
      return output;
    };
    ThaiJS.prototype.save = function() {
      return [this.index, this.token];
    };
    ThaiJS.prototype.restore = function(c) {
      return this.index = c[0], this.token = c[1], c;
    };
    ThaiJS.prototype.test = function(tester) {
      return this.index < this.tokens.length && this.tokens[this.index].test(tester);
    };
    ThaiJS.prototype.read = function(tester) {
      if (this.test(tester)) {
        this.token = this.tokens[this.index++];
        return true;
      } else {
        this.token = null;
        return false;
      }
    };
    ThaiJS.prototype.expect = function(tester, what) {
      if (this.read(tester)) {
        return true;
      } else {
        throw new Error('expected: ' + what + ', instead found ' + JSON.stringify(this.tokens[this.index].text));
      }
    };
    ThaiJS.prototype.push = function() {
      return this.output.push(this.token);
    };
    ThaiJS.prototype.pushToken = function(x) {
      return this.output.push(new Token(x));
    };
    ThaiJS.prototype.skip = function() {
      var output;
      output = '';
      while (this.read(WS) || this.read(/^\/\//) || this.read(/^\/\*/)) {
        output += this.token.text;
      }
      return output;
    };
    ThaiJS.prototype.catPrefix = function() {
      if (this.catStack.length > 0) {
        return '$' + this.catStack[this.catStack.length - 1] + '_';
      } else {
        return '';
      }
    };
    ThaiJS.prototype.parse = function(stop) {
      var output;
      output = '';
      while (true) {
        if (this.index >= this.tokens.length) {
          if (!stop) {
            break;
          } else {
            throw new Error('unexpected end of file');
          }
        } else if (stop && this.read(stop)) {
          break;
        } else if (this.read(')') || this.read(']') || this.read('}')) {
          break;
        } else if (this.read(/^@[\w]+$/)) {
          output += 'this._' + this.token.text.substr(1);
        } else if (this.read(/^@@[\w]+$/)) {
          output += 'this._' + this.catPrefix() + this.token.text.substr(2);
        } else if (this.read('@[')) {
          output += 'this["_" + (' + this.parse(']') + ')]';
        } else if (this.read('@@[')) {
          output += 'this["_' + this.catPrefix() + '" + (' + this.parse(']') + ')]';
        } else if (this.read('class')) {
          output += this.parseClass();
        } else if (this.read('patch')) {
          output += this.parseClass();
        } else if (this.read('super')) {
          if (this.read('(')) {
            this.read(WS);
            if (this.read(')')) {
              output += 'arguments.callee._super.call(this)';
            } else {
              output += 'arguments.callee._super.call(this, ' + this.parse(')') + ')';
            }
          } else {
            output += 'arguments.callee._super.apply(this, arguments)';
          }
        } else if (this.read('{')) {
          output += '{' + this.parse('}') + '}';
        } else if (this.read('(')) {
          output += '(' + this.parse(')') + ')';
        } else if (this.read('[')) {
          output += '[' + this.parse(']') + ']';
        } else if (this.read('#')) {
          if (this.expect(WORD, 'component name')) {
            output += 'app._components.' + this.token.text;
          }
        } else if (this.read('::')) {
          if (this.expect(WORD, 'method name')) {
            output += '.proxy(\'' + this.token.text + '\')';
          }
        } else if (this.read(function() {
          return true;
        })) {
          output += this.token.text;
        }
      }
      return output;
    };
    ThaiJS.prototype.parseClass = function() {
      var catName, classname, first, name, output, state, _ref;
      this.expect(WS, 'whitespace');
      this.expect(WORD, 'class name');
      classname = this.token.text;
      catName = '';
      if (this.read('(')) {
        this.expect(WORD, 'category name');
        catName = this.token.text;
        this.expect(')', ')');
      }
      state = this.save();
      this.skip();
      output = '';
      if (this.read('extends')) {
        this.skip();
        this.expect(WORD, 'class name');
        output += "defClass(\"" + classname + "\", " + this.token.text + ")";
      } else {
        this.restore(state);
        output += "defClass(\"" + classname + "\")";
      }
      first = true;
      this.catStack.push(catName);
      this.classStack.push(classname);
      while (true) {
        state = this.save();
        name = '';
        this.skip();
        while (this.read(WORD)) {
          if ((_ref = this.token.text) === 'var' || _ref === 'class' || _ref === 'function') {
            this.restore(state);
            break;
          }
          name += '.' + this.token.text;
          this.skip();
        }
        if (first && name === '') {
          name = '.prototype.implement';
        }
        if (name !== '' && this.read('{')) {
          output += ("" + name + "(") + this.parseDecl() + ")";
        } else {
          this.restore(state);
          break;
        }
        first = false;
      }
      this.catStack.pop();
      this.classStack.pop();
      state = this.save();
      this.skip();
      if (this.read('.')) {
        return output + '.';
      } else {
        this.restore(state);
        return output + ';';
      }
    };
    ThaiJS.prototype.parseDecl = function(name) {
      var buffer, count, decls, output, skipped;
      output = "{";
      count = 0;
      decls = [];
      buffer = '';
      while (true) {
        if (skipped = this.skip()) {
          buffer += skipped;
        } else if (this.read('}')) {
          break;
        } else if (this.read(/^@@\w+$/)) {
          decls.push(buffer + this.parseDeclItem('_' + this.catPrefix() + this.token.text.replace(/^@@/, '')));
          buffer = '';
        } else if (this.read(/^@\w+$/)) {
          decls.push(buffer + this.parseDeclItem(this.token.text.replace(/^@/, '_')));
          buffer = '';
        } else if (this.expect(WORD, 'method or variable name')) {
          decls.push(buffer + this.parseDeclItem(this.token.text));
          buffer = '';
        }
      }
      return output + decls.join(',') + buffer + '}';
    };
    ThaiJS.prototype.parseDeclItem = function(name) {
      var arglist, preamble, skipped, skipped2;
      preamble = name + ': ';
      this.read(WS);
      if (this.read(':') || this.read('=')) {
        this.read(WS);
        return preamble + this.parse(/^[;,]$/);
      } else if (this.read('{')) {
        return preamble + 'function() {' + this.parse('}') + '}';
      } else if (this.expect('(', ':, {, or (')) {
        arglist = '';
        this.read(WS);
        if (!this.read(')')) {
          while (this.expect(WORD, 'variable name')) {
            arglist += this.token.text;
            this.read(WS);
            if (this.read(')')) {
              break;
            } else if (this.expect(',', ',')) {
              arglist += ', ';
              this.read(WS);
            }
          }
        }
        skipped = this.skip();
        if (skipped.match(/^[ ]+$/)) {
          skipped = '';
        }
        if (this.read('{')) {
          return preamble + 'function(' + arglist + ') {' + skipped + this.parse('}') + '}';
        } else if (this.read('=')) {
          this.expect('0', '=0');
          skipped2 = this.skip();
          this.expect(';', '=0;');
          return preamble + 'function(' + arglist + ') {' + skipped + 'throw new Error(' + JSON.stringify("unimplemented: " + this.classStack[this.classStack.length - 1] + '#' + name + '(' + arglist + ')') + ');' + skipped2 + '}';
        } else {
          return preamble + 'function(' + arglist + ') { ' + skipped + 'return ' + this.parse(/^[;,]$/) + '; }';
        }
      }
    };
    return ThaiJS;
  })();
}).call(this);
