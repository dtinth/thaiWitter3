#!/usr/bin/env coffee

class Token

	constructor: (@text, @index) ->

	test: (tester) ->
		if tester instanceof Function
			tester @
		else if tester instanceof RegExp
			tester.test @text
		else
			tester == @text

module.exports = class ThaiJS

	@compile: (code) ->
		tokens = @tokenize(code)
		compiler = new this(tokens)
		lineMap = []
		index = 0
		for line in code.split '\n'
			lineMap.push(index)
			index += line.length + 1
		try
			compiler.compile()
		catch e
			if compiler.index < compiler.tokens.length
				for index, line in lineMap
					if compiler.tokens[compiler.index].index >= index
						place = ' at line ' + (line + 1) + ' col ' + (compiler.tokens[compiler.index].index - index + 1)
			else
				place = ' at eof'
			throw new Error e.message + place

	@tokenize: (code) ->
		re = ///
			  @[\w]+
			| @\[
			| @@[\w]+
			| @@\[
			| \w+
			| //.*
			| /\*[\s\S]*?\*/
			| "(?:\\[\s\S]|[^"])*"
			| '(?:\\[\s\S]|[^'])*'
			| /(?:\\[\s\S]|[^\n/])*/
			| ::
			| \s+
			| \S
		///g
		tokens = []
		while (match = re.exec(code)) != null
			tokens.push new Token(match[0], match.index)
		tokens

	WS = /^\s+$/
	WORD = /^\w+$/

	constructor: (@tokens) ->

	compile: ->
		@catStack = []
		@classStack = []
		@index = 0
		output = @parse()
		if @index < @tokens.length
			throw new Error "end-of-file expected"
		output

	save:        -> [ @index, @token ]
	restore: (c) -> [ @index, @token ] = c

	test: (tester) -> @index < @tokens.length and @tokens[@index].test tester

	read: (tester) ->
		if @test tester
			@token = @tokens[@index++]
			true
		else
			@token = null
			false

	expect: (tester, what) ->
		if @read tester
			true
		else
			throw new Error 'expected: ' + what + ', instead found ' + JSON.stringify(@tokens[@index].text)

	push: -> @output.push @token

	pushToken: (x) -> @output.push new Token(x)

	skip: ->
		output = ''
		while @read(WS) or @read(/^\/\//) or @read(/^\/\*/)
			output += @token.text
		return output

	catPrefix: ->
		if @catStack.length > 0
			'$' + @catStack[@catStack.length - 1] + '_'
		else
			''

	parse: (stop) ->
		output = ''
		loop
			if @index >= @tokens.length
				if not stop
					break
				else
					throw new Error 'unexpected end of file'
			else if stop and @read stop
				break
			else if @read(')') or @read(']') or @read('}')
				break
			else if @read /^@[\w]+$/
				output += 'this._' + @token.text.substr(1)
			else if @read /^@@[\w]+$/
				output += 'this._' + @catPrefix() + @token.text.substr(2)
			else if @read '@['
				output += 'this["_" + (' + @parse(']') + ')]'
			else if @read '@@['
				output += 'this["_' + @catPrefix() + '" + (' + @parse(']') + ')]'
			else if @read 'class'
				output += @parseClass()
			else if @read 'patch'
				output += @parseClass()
			else if @read 'super'
				if @read '('
					@read WS
					if @read ')'
						output += 'arguments.callee._super.call(this)'
					else
						output += 'arguments.callee._super.call(this, ' + @parse(')') + ')'
				else
					output += 'arguments.callee._super.apply(this, arguments)'
			else if @read '{'
				output += '{' + @parse('}') + '}'
			else if @read '('
				output += '(' + @parse(')') + ')'
			else if @read '['
				output += '[' + @parse(']') + ']'
			else if @read '#'
				if @expect WORD, 'component name'
					output += 'app._components.' + @token.text
			else if @read '::'
				if @expect WORD, 'method name'
					output += '.proxy(\'' + @token.text + '\')'
			else if @read(-> true)
				output += @token.text
		output

	parseClass: ->
		
		@expect WS,   'whitespace'
		@expect WORD, 'class name'
		classname = @token.text

		catName = ''
		if @read '('
			@expect WORD, 'category name'
			catName = @token.text
			@expect ')', ')'

		state = @save()
		@skip()
		output = ''
		if @read 'extends'
			@skip()
			@expect WORD, 'class name'
			output += "defClass(\"#{classname}\", #{@token.text})"
		else
			@restore state
			output += "defClass(\"#{classname}\")"

		first = true

		@catStack.push(catName)
		@classStack.push(classname)
		loop
			state = @save()
			name = ''
			@skip()
			while @read WORD
				if @token.text in ['var', 'class', 'function']
					@restore state
					break
				name += '.' + @token.text
				@skip()
			if first and name == ''
				name = '.prototype.implement'
			if name != '' and @read '{'
				output += "#{name}(" + @parseDecl() + ")"
			else
				@restore state
				break
			first = false
		@catStack.pop()
		@classStack.pop()

		state = @save()
		@skip()
		if @read '.'
			output + '.'
		else
			@restore state
			output + ';'

	parseDecl: (name) ->
		output = "{"
		count = 0
		decls = []
		buffer = ''
		loop
			if skipped = @skip()
				buffer += skipped
			else if @read '}'
				break
			else if @read /^@@\w+$/
				decls.push buffer + @parseDeclItem('_' + @catPrefix() + @token.text.replace(/^@@/, ''))
				buffer = ''
			else if @read /^@\w+$/
				decls.push buffer + @parseDeclItem(@token.text.replace(/^@/, '_'))
				buffer = ''
			else if @expect WORD, 'method or variable name'
				decls.push buffer + @parseDeclItem(@token.text)
				buffer = ''
		output + decls.join(',') + buffer + '}'

	parseDeclItem: (name) ->
		preamble = name + ': '
		@read WS
		if @read(':') or @read('=')
			@read WS
			preamble + @parse(/^[;,]$/)
		else if @read '{'
			preamble + 'function() {' + @parse('}') + '}'
		else if @expect '(', ':, {, or ('
			arglist = ''
			@read WS
			if not @read ')'
				while @expect WORD, 'variable name'
					arglist += @token.text
					@read WS
					if @read ')'
						break
					else if @expect ',', ','
						arglist += ', '
						@read WS
			skipped = @skip()
			if skipped.match /^[ ]+$/
				skipped = ''
			if @read '{'
				preamble + 'function(' + arglist + ') {' + skipped + @parse('}') + '}'
			else if @read '='
				@expect '0', '=0'
				skipped2 = @skip()
				@expect ';', '=0;'
				preamble + 'function(' + arglist + ') {' + skipped + 'throw new Error(' + JSON.stringify("unimplemented: " + @classStack[@classStack.length - 1] + '#' + name + '(' + arglist + ')') + ');' + skipped2 + '}'
			else
				preamble + 'function(' + arglist + ') { ' + skipped + 'return ' + @parse(/^[;,]$/) + '; }'

