/**
 * piik prototype
 * 
 * @author Rob van der Burgt rburgt@gmail.com
 */
(function( window, document, undefined ){
	/**
	 * combines two objects
	 */
	var apply = function( targetObj, sourceObj ){
		for ( var prop in sourceObj ){
			targetObj[prop] = sourceObj[prop];
		}
		
		return targetObj;
	};
	
	var useragent = window.navigator.userAgent.toLowerCase(),
		browserMatch = /(webkit)[ \/]([\w.]+)/.exec( useragent ) 
						|| useragent.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+))?/.exec( useragent ),
		browser = {
			name : browserMatch[1],
			version : browserMatch[2],
			
			webkit : browserMatch[1] == 'webkit',
			mozilla :  browserMatch[1] == 'mozilla'
		};
	
	/**
	 * gets all the child elements of any given element
	 */
	var flattenElement = function( element ){
		var elements = [],
			children = element.childNodes,
			childrenCount = children.length;
		
		for ( var i in children ){
			var child = children[i];
			if ( !child.nodeType || child.nodeType !== 1 )
				continue;
			
			var grandChilds = flattenElement( child );
			grandChilds.unshift( child );
			elements.push.apply( elements, grandChilds );
		}
		
		return elements;
	};
	
	/**
	 * css tools
	 * TODO: create mapper for css3 animations based on browser
	 */
	var css = {
		
	};
	
	/**
	 * piik main class
	 */
	var piik = window.piik = function( targetId ){
		this.isEditing = true;
		this.sourceEl = document.getElementById( targetId );
		this.initLayout();
		this.initCharacterMap();
	};
	
	apply( piik.prototype, {
		
		/**
		 * create layout
		 */
		initLayout : function(){
			var _self = this,
				sourceEl = this.sourceEl,
				sourceWidth = sourceEl.clientWidth + 'px',
				sourceHeight = sourceEl.clientHeight + 'px';
			
			/**
			 * main piik wrapper
			 */
			var piikEl = apply(this.piikEl = document.createElement('div'), {
				className : 'piik'
			});
			
			/**
			 * creates piik toggle button
			 */
			var toggleEl = apply(this.toggleEl = document.createElement('button'), {
				className : 'aboe',
				innerHTML : 'piik aboe',
				onclick : function(){
					_self.aboe();
				}
			});
			piikEl.appendChild( toggleEl );
			
			/**
			 * create wrapper for source/result
			 */
			var wrapperEl = apply(this.wrapperEl = document.createElement('div'), {
				className : 'editWrapper'
			});
			piikEl.appendChild( wrapperEl );
			
			/**
			 * create animated result element
			 */
			var animatedEl = apply(this.animatedEl = document.createElement('iframe'), {
				className : 'result'
			});
			animatedEl.style.width = sourceWidth;
			animatedEl.style.height = sourceHeight;
			wrapperEl.appendChild( animatedEl );
			
			/**
			 * create result element
			 */
			var resultEl = apply(this.resultEl = document.createElement('iframe'), {
				className : 'result'
			});
			resultEl.style.width = sourceWidth;
			resultEl.style.height = sourceHeight;
			wrapperEl.appendChild( resultEl );
			
			/**
			 * transform visual dom
			 */
			sourceEl.parentNode.appendChild( piikEl );
			sourceEl.className += ' source';
			wrapperEl.appendChild( sourceEl );
		},
		
		/**
		 * the width of the used characters need to be mapped
		 * so the editor is not depending on the font used
		 */
		initCharacterMap : function(){
			this.characterMap = {};
			
			// get the corrections for the characters style in the editor
			var sourceStyle = getComputedStyle( this.sourceEl );
			this.characterCorrection = {
				left : parseInt(sourceStyle.paddingLeft.replace('px', '')),
				top : parseInt(sourceStyle.paddingTop.replace('px', '')),
				line : parseInt(sourceStyle.lineHeight == 'normal' ? 16 : sourceStyle.lineHeight.replace('px', ''))
			};
			
			// create an element with the same style as the editor
			// the with of the element will be used as the characters width
			this.characterEl = document.createElement('span');
			
			apply(this.characterEl.style, {
				cssText : sourceStyle.cssText,
				padding: 0,
				margin: 0,
				border: 0,
				width: 'auto',
				height: 'auto',
				display: 'none'
			});
			this.piikEl.appendChild( this.characterEl );
			
			// premap ASCII table
			var characters = [];
			for (var i = 0; i < 256; i++)
				characters.push(i);
				
			this.mapCharacters( String.fromCharCode.apply(String, characters) );
		},
		
		/**
		 * maps characters width
		 */
		mapCharacters : function( characters ){
			var characterEl = this.characterEl,
				characterMap = this.characterMap,
				charactersLength = characters.length;
			
			// show character element so with can be measured
			characterEl.style.display = 'inline';
			
			for ( var i=0; i<charactersLength; i++ ){
				var currentChar = characters.charAt(i);
				characterEl.innerHTML = currentChar;
				characterMap[currentChar] = characterEl.offsetWidth;
			}
			
			characterEl.style.display = 'none';
		},
		
		/**
		 * get the width of an string in the editor
		 */
		getCharactersWidth : function( characters ){
			var charactersLength = characters.length,
				characterMap = this.characterMap,
				width = 0;
			
			for ( var i=0; i<charactersLength; i++ ){
				var currentChar = characters.charAt(i),
					mappedValue = characterMap[currentChar];
				
				// test if character is present
				if ( typeof mappedValue == 'undefined' ) {
					this.mapCharacters( currentChar );
					mappedValue = characterMap[currentChar]
				}
				
				width += mappedValue;
			}
			
			return width;
		},
		
		/**
		 * piik aboe, toggles the view, does some magic
		 */
		aboe : function(){
			if ( this.isEditing )
				this.showResult();
			else
				this.showSource();
		},
		
		/**
		 * display source screen
		 */
		showSource : function(){
			if ( this.isEditing )
				return;
				
			this.isEditing = true;
			
			this.sourceEl.style.zIndex = 10;
			this.resultEl.style.zIndex = 5;
		},
		
		/**
		 * display result screen / animation
		 */
		showResult : function(){
			if ( !this.isEditing )
				return;
				
			this.isEditing = false;
			
			var charracterCorrection = this.characterCorrection,
				resultDocument = this.resultEl.contentDocument,
				sourceValue = this.sourceEl.value,
				sourceLines = sourceValue.split("\n"),
				sourceLineCount = sourceLines.length,
				lineIndex = 0,
				charIndex = 0;
			
			resultDocument.documentElement.innerHTML = sourceValue
			
			// find out if there is an body tag and on wich line it starts
			//console.log( sourceValue.match( ));
			var bodyPos = sourceValue.search( new RegExp('<body[^>]*>([\\S\\s]*?)<\\/body>', 'gim' ));
			
			// only the body needs to be animated
			if ( bodyPos !== -1 ) {
				lineIndex = sourceValue.substr( 0, bodyPos ).split("\n").length -1;
				charIndex = sourceLines[lineIndex].indexOf('<body');
			}
			
			// thanks to http://ejohn.org/files/htmlparser.js
			var startTag = /^<([-A-Za-z0-9_]+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/igm;
			
			for (; lineIndex < sourceLineCount; lineIndex++ ) {
				var line = sourceLines[lineIndex],
					characterCount = line.length; 
					
				for(; charIndex < characterCount; charIndex++ ){
					// only test if char is <
					if ( line.charAt( charIndex ) == '<' ){
						// check if this tag is a valid starting tag
						var tag = line.substring( charIndex ).match( startTag );
						
						if ( tag && tag.length > 0 ){
							tag = tag[0];
							
							// hooray! valid tag found, now lets position it
							charIndex += tag.length;
							
							var el = document.createElement('div');
							
							apply(el.style, {
								padding: 0,
								margin: 0,
								border: 1,
								width: '100px',
								height: '20px',
								backgroundColor: 'red',
								position: 'absolute',
								top : ((lineIndex * charracterCorrection.line ) + charracterCorrection.top) + 'px',
								zIndex : 200,
								left : (this.getCharactersWidth( line.substring( 0, charIndex ) ) + charracterCorrection.left) + 'px'
							});
							
							
							this.wrapperEl.appendChild( el );
						}
					}
				}
					
				charIndex = 0;
			}
			
			console.log( flattenElement( resultDocument.body ) );
			//, flattenElement( resultDocument.body )
			/**
			 * css transition test
			 */
			var resultHead = resultDocument.getElementsByTagName('head')[0],
				style = resultDocument.createElement('style');
			
			style.innerHTML = '@-webkit-keyframes globalin { 0% { background: #000; font-size: 12px; margin: 0; padding: 0; text-indent: 0; border: 0; color: #fff;} } body, * { -webkit-animation-name: globalin; -webkit-animation-duration: 1s; } ';
			resultHead.appendChild(style);
			
			/**
			 * switch result/source element zindex
			 */
			this.resultEl.style.zIndex = 10;
			this.sourceEl.style.zIndex = 5;
		}
	} );
})( window, document );
