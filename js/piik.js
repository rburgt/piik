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
	 * returns the full css text of an element
	 */
	var getElementCssText = function( element ){
		if ( browser.webkit ){
			return getComputedStyle(element).cssText;
		}
		
		if ( browser.mozilla ){
			var computedStyle = getComputedStyle(element),
				cssText = '';
			
			for (var property in computedStyle) { 
			    if (computedStyle.hasOwnProperty(property)) {  
			        cssText += computedStyle[property] + ':' + computedStyle.getPropertyCSSValue(computedStyle[property]).cssText + ';';
			    } 
			}
			
			return cssText;
		}

		return '';
	};
	
	var getOffsets = function( element, documentBody ){
		documentBody = typeof documentBody == 'undefined' ? document.body : documentBody;
	 
	    var offsetLeft = element.offsetLeft,
	    	offsetTop = element.offsetTop,
	    	offsetParent = element.offsetParent;
	 
	    while( offsetParent != documentBody ) {
	    	offsetLeft += offsetParent.offsetLeft;
	        offsetTop += offsetParent.offsetTop;
	        offsetParent = offsetParent.offsetParent;
	    }
	        
	    return {
	    	top : offsetTop,
	    	left : offsetLeft
	    };
	};
		
	// searches for an tag beginning/endtag
	// thanks to http://ejohn.org/files/htmlparser.js
	var startTag = /^<([-A-Za-z0-9_]+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/igm,
		endTag = /^<\/([-A-Za-z0-9_]+)[^>]*>/;
	
	/**
	 * removes the standard webkit animation properties so own can be applied
	 */
	var noWebkitAnimations = /webkit\-animation.*;/gim;
	
	/**
	 * characters not to be animated
	 */
	var notAnimatedChars = [' ', '\n', '\t'];
	
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
				innerHTML : 'piik!',
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
				className : 'animated'
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
		 * so the animation is not dependant on the font used
		 * 
		 * this method initiates an element to test the with of 
		 * an character used in the editor
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
		 * measures the width of characters and caches it for later
		 * use
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
		 * TODO: backwards animation
		 */
		showSource : function(){
			if ( this.isEditing )
				return;
				
			this.isEditing = true;
			
			this.sourceEl.style.zIndex = 10;
			this.animatedEl.style.zIndex = 5;
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
				animationDoc = this.animatedEl.contentDocument,
				sourceValue = this.sourceEl.value,
				sourceLength = sourceValue.length,
				sourceLines = sourceValue.split("\n"),
				//sourceLineCount = sourceLines.length,
				lineIndex = 0,
				charIndex = 0
			
			// push sourcecode to viewing panels
			this.resultEl.contentDocument.documentElement.innerHTML = sourceValue
			animationDoc.documentElement.innerHTML = sourceValue
			
			// find out if there is an body tag and on wich line it starts
			//console.log( sourceValue.match( ));
			var bodyPos = sourceValue.search( new RegExp('<body[^>]*>([\\S\\s]*?)<\\/body>', 'gim' ));
			
			if ( bodyPos !== -1 ) {
				// body tag is found, calculate an alternate starting point for source analysis
				lineIndex = sourceValue.substr( 0, bodyPos ).split("\n").length -1;
				charIndex = bodyPos + sourceValue.substring( bodyPos ).match( startTag )[0].length;
			}
			
			// figure out where the start tags in the source are located
			// collect the non tag characters to compare with textnodes later
			var startTags = [],
				textCharacters = [];
			
			while ( charIndex < sourceLength ) {
				var charStartTag = sourceValue.substring( charIndex ).match( startTag );
				if ( charStartTag && charStartTag.length > 0  )
				{
					charStartTag = charStartTag[0];
					
					
					var lastNewLineIndex = sourceValue.substring( 0, charIndex ).lastIndexOf("\n") + 1,
						lineText = sourceValue.substring( lastNewLineIndex, charIndex + charStartTag.length ),
						innerCharIndex = charIndex + charStartTag.length,
						innerLineIndex = lineIndex + charStartTag.split("\n").length -1;
					
					startTags.push({
						startTag : charStartTag,
						top : ((lineIndex * charracterCorrection.line ) + charracterCorrection.top),
						left : (this.getCharactersWidth( lineText ) + charracterCorrection.left),
						innerCharIndex : innerCharIndex,
						innerLineIndex : innerLineIndex
					});
					
					charIndex = innerCharIndex;
					lineIndex = innerLineIndex;
					
					continue;
				}
				
				var charEndTag = sourceValue.substring( charIndex ).match( endTag );
				if ( charEndTag && charEndTag.length > 0  )
				{
					charEndTag = charEndTag[0];
					
					// nothing to process anymore after body ends
					if ( charEndTag == '</body>' )
						break;
					
					charIndex += charEndTag.length;
					lineIndex += charEndTag.split("\n").length -1;
					continue;
				}
				
				var character = sourceValue.charAt( charIndex )
				
				
				if ( notAnimatedChars.indexOf( character ) == -1 ) {
					var lastNewLineIndex = sourceValue.substring( 0, charIndex ).lastIndexOf("\n") + 1,
						lineText = sourceValue.substring( lastNewLineIndex, charIndex )
					
					textCharacters.push({
						character : character,
						//top : lineIndex,
						//left : charIndex - lastNewLineIndex
						top : ((lineIndex * charracterCorrection.line ) + charracterCorrection.top),
						left : (this.getCharactersWidth( lineText ) + charracterCorrection.left)
					});
				};
				
				if ( character == "\n" )
					lineIndex++;
				
				// normal char
				charIndex++;
			}
			
			
			/**
			 * generate css animation
			 */
			var animation = '',
				tagLength = startTags.length,
				tagIndex = -1,
				usedElements = [],
				startWidth = this.sourceEl.clientWidth + 'px',
				characterIndex = 0;
			
			// create an tag to sniff for an character position
			// non existing tag used so webpage stylesheet wil have no impact
			var sniffEl = document.createElement('span');
			
			
			var animateElement = function( element ){
				
				var childNodes = element.childNodes;
				
				// get the original styling applied
				var style = getComputedStyle( element ),
					cssText = style.cssText;
				
				// remove the original animations
				cssText = cssText.replace(noWebkitAnimations, '');
				
				if ( element != animationDoc.body ){
					tagIndex++;
					var tag = startTags[tagIndex],
						t = tagIndex;
					
					
					if ( style.display == 'block' || style.display == 'inline-block' ){
						var elementOffsets = getOffsets( element, animationDoc.body );
						
						animation += [
							'.piikoriginal' + t + ' {',
								cssText,
							'} ',
							'@-webkit-keyframes piik' + t + ' { 0% {',
								//'position: absolute;',
								'top: ' + tag.top  + 'px;',
								'text-indent: ' + tag.left  + 'px;',
								'left: 0px;',
								'font-size: 12px;',
								'margin: auto;',
								'padding: auto;',
								'border: auto;',
								'width: ' + startWidth + ';',
								'background-color: transparent;',
								//'text-align: left;',
							'} } ',
							
							'.piik' + t + ' {',
								'-webkit-animation-name: piik' + t + ';',
								'-webkit-animation-duration: 800ms;', 
								'-webkit-animation-timing-function: ease-in;', 
								'position: absolute;',
								'top: ' + elementOffsets.top  + 'px;',
								'left: ' + elementOffsets.left  + 'px;',
								'width: ' + element.offsetWidth  + 'px;',
								'height: ' + element.offsetHeight + 'px;',
								'margin: 0px;',
								'padding: 0px;',
								'border: 0px;',
							'}'
						].join("\n");
						
						// generated class can not be applied directly because it will interfere
						// with childNode styling
						element.piikClass = 'piikoriginal' + t + ' piik' + t;
					}
						
					usedElements.push( element );
				}
				
				// childNodes.length need to be calculated every time
				// because character position detection will add nodes
				for ( var i = 0; i < childNodes.length; i++ ){
					var node = childNodes[i];
					
					if ( !node.nodeType )
						continue;
					
					switch( node.nodeType ){
						case 1:
							animateElement.call(this, node );
							break;
							
						case 3:
							// clone style of element for character position sniffing
							sniffEl.style.cssText = cssText;
							// prevent document style from overriding element positioning
							apply( sniffEl.style, {
								margin : '0',
								padding: '0',
								border: '0',
								display: 'inline',
								'float': 'none',
								position: 'static',
								border: '0',
								height: 'auto',
								width: 'auto'
							} );
							
							// detect individual positions of characters
							var nodedata = node.data,
								nodeLenght = nodedata.length,
								range = animationDoc.createRange(),
								charUnusedIndex = 0;
								
							for ( var ni = 0; ni < nodeLenght; ni++ ){
								var charString = nodedata.charAt(ni);
								
								if ( notAnimatedChars.indexOf( charString ) != -1 ){
									charUnusedIndex++;
									continue;
								}
								
								// get the calculated character information 
								var characterInfo = textCharacters[characterIndex],
									characterElement = sniffEl.cloneNode(false);
								
								characterIndex++;
								characterElement.innerHTML = charString;
								characterElement.allowData = true;
								
								range.setStart( node, charUnusedIndex +1 );
								range.setEnd( node, charUnusedIndex + 1 );
								range.insertNode( characterElement );
								
								console.log( charString, characterInfo.top, characterInfo.left, characterElement.offsetTop, characterElement.offsetLeft );
								
								
								var characterOffsets = getOffsets( characterElement, animationDoc.body );
								
								animation += [
									'.piikcharoriginal' + characterIndex + ' {',
										cssText,
									'} ',
									'@-webkit-keyframes piikchar' + characterIndex + ' { 0% {',
										//'position: absolute;',
										'top: ' + characterInfo.top  + 'px;',
										'left: ' + characterInfo.left  + 'px;',
										'font-size: 12px;',
										'margin: auto;',
										'padding: auto;',
										'border: auto;',
										'background-color: transparent;',
										//'text-align: left;',
									'} } ',
									
									'.piikchar' + characterIndex + ' {',
										'-webkit-animation-name: piikchar' + characterIndex + ';',
										'-webkit-animation-duration: 800ms;', 
										'-webkit-animation-timing-function: ease-in;', 
										'position: absolute;',
										'top: ' + characterOffsets.top  + 'px;',
										'left: ' + (characterOffsets.left - characterElement.offsetWidth )  + 'px;',
										'display: block;',
										'margin: 0px;',
										'padding: 0px;',
										'border: 0px;',
										'text-indent: 0px;',
										'width: auto;',
										'height: auto;',
										'background: none;',
									'}'
								].join("\n");
								
								// generated class can not be applied directly because it will interfere
								// with childNode styling
								characterElement.piikClass = 'piikcharoriginal' + characterIndex + ' piikchar' + characterIndex;
								usedElements.push( characterElement );
								
								element.removeChild( characterElement );
								
								charUnusedIndex = 0;
								i++;
								node = childNodes[i];
							}
							break;
					}
				}
			};
			
			animateElement.call(this, animationDoc.body);
			
			
			// append all used elements directly to the body to 
			// allow correct absolute positioning
			usedElements.forEach(function( element ){
				element.style.cssText = '';
				element.id = '';
				
				var childNodes = element.childNodes,
					childLength = childNodes.length;
				
				// clear the original textNode data of the element
				if ( !element.allowData ){
					for ( var x = 0; x < childLength; x++ ){
						var node = childNodes[x];
						
						// check if node is an text node
						if ( node.nodeType != 3 )
							continue;
							
						node.data = '';
					}
				}
				
				animationDoc.body.appendChild( element );
				
				if ( element.piikClass )
					element.className = element.piikClass;
			});
			
			// background fade animation
			animation += [
				'@-webkit-keyframes piikbody { 0% {',
					'background-color: #222;',
				'} } ',
				'body {',
					'-webkit-animation-name: piikbody;',
					'-webkit-animation-duration: .8s;',
				'}'
			].join("\n");
			
			/**
			 * apply animation to result
			 */
			var resultHead = animationDoc.getElementsByTagName('head')[0],
				style = animationDoc.createElement('style');
			
			style.innerHTML = animation;
			resultHead.appendChild(style);
			
			/**
			 * switch result/source element zindex
			 */
			this.animatedEl.style.zIndex = 15;
			this.resultEl.style.zIndex = 10;
			this.sourceEl.style.zIndex = 5;
			
			// do a little victory dance
			// 0/-<  0|-<  0\-<  0>-<
		}
	} );
})( window, document );
