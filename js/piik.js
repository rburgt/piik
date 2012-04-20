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
	
	// searches for an tag beginning
	// thanks to http://ejohn.org/files/htmlparser.js
	var startTag = /^<([-A-Za-z0-9_]+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/igm;
	
	/**
	 * removes the standard webkit animation properties so own can be applied
	 */
	var noWebkitAnimations = /webkit\-animation.*;/gim;
	
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
				sourceLines = sourceValue.split("\n"),
				sourceLineCount = sourceLines.length,
				lineIndex = 0,
				charIndex = 0
			
			// push sourcecode to viewing panels
			this.resultEl.contentDocument.documentElement.innerHTML = sourceValue
			animationDoc.documentElement.innerHTML = sourceValue
			
			// get the body elements as an flat array
			var animatedElements = flattenElement( animationDoc.body );
			
			// find out if there is an body tag and on wich line it starts
			//console.log( sourceValue.match( ));
			var bodyPos = sourceValue.search( new RegExp('<body[^>]*>([\\S\\s]*?)<\\/body>', 'gim' ));
			
			if ( bodyPos !== -1 ) {
				// body tag is found, calculate an alternate starting point for source analysis
				lineIndex = sourceValue.substr( 0, bodyPos ).split("\n").length -1;
				charIndex = sourceLines[lineIndex].indexOf('<body');
				
				//add body to element list
				animatedElements.unshift( animationDoc.body );
			}
			
			// figure out where the start tags in the source are located
			var startTags = [];
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
							
							startTags.push({
								startTag : tag,
								top : (((lineIndex + 1) * charracterCorrection.line ) + charracterCorrection.top),
								left : (this.getCharactersWidth( line.substring( 0, charIndex ) ) + charracterCorrection.left)
							});
						}
					}
				}
					
				charIndex = 0;
			}
			
			
			/**
			 * generate css animation
			 */
			var animation = '',
				tagLength = startTags.length,
				usedElements = [],
				startWidth = this.sourceEl.clientWidth + 'px';
				
			for ( var t = 0; t < tagLength; t++ ){
				var tag = startTags[t],
					element = animatedElements[t];
				
				// animations break on body element
				if ( element == animationDoc.body )
					continue;
					
				// get the original styling applied
				var style = getComputedStyle( element ),
					cssText = style.cssText;
				
				// remove the original animations
				cssText = cssText.replace(noWebkitAnimations, '');
				
				if (  (style.display == 'inline' || style.display == 'inline-block') ){
					animation += [
						'@-webkit-keyframes piik' + t + ' { 0% {',
							'text-indent: ' + this.getCharactersWidth(tag.startTag)  + 'px;',
							'left: 0px;',
							'font-size: 12px;',
							'font-weight: normal;',
							'margin: auto;',
							'padding: auto;',
							'border: auto;',
							'width: ' + startWidth + ';',
							'background-color: transparent;',
						'} } ',
						'.piikoriginal' + t + ' {',
							cssText,
						'}',
						'.piik' + t + ' {',
							'-webkit-animation-name: piik' + t + ';',
							'-webkit-animation-duration: 1.2s;', 
							'-webkit-animation-timing-function: ease-in;', 
						'}'
					].join("\n");
					
				}
				else
				{
					animation += [
						'.piikoriginal' + t + ', .piikplaceholder' + t + ' {',
							cssText,
						'} ',
						
						'.piikplaceholder' + t + ' {',
							'-webkit-animation-name: piikplaceholder' + t + ';',
							'-webkit-animation-duration: .6s;', 
							'-webkit-animation-timing-function: ease-in;', 
							'visibility: hidden;',
							'width: ' + element.offsetWidth  + 'px;',
							'height: ' + element.offsetHeight + 'px;',
							'display: inline-block;',
						'} ',
						
						'@-webkit-keyframes piikplaceholder' + t + ' { 0% {',
							'margin: auto;',
							'padding: auto;',
							'border: auto;',
							'width: auto;',
						'} } ',
						
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
							'-webkit-animation-duration: 1.2s;', 
							'-webkit-animation-timing-function: ease-in;', 
							'position: absolute;',
							'top: ' + element.offsetTop  + 'px;',
							'left: ' + element.offsetLeft  + 'px;',
							'width: ' + element.offsetWidth  + 'px;',
							'height: ' + element.offsetHeight + 'px;',
							'margin: 0px;',
							'padding: 0px;',
							'border: 0px;',
						'}'
					].join("\n");
					
					var placeholderEl = document.createElement('div');
					placeholderEl.className = 'piikplaceholder' + t;
					
					element.placeholderEl = placeholderEl;
					
					usedElements.push( element );
				}
				
				// generated class can not be applied directly because it will interfere
				// with childNode styling
				element.piikClass = 'piikoriginal' + t + ' piik' + t;
			}
			
			// append all used elements directly to the body to 
			// allow correct absolute positioning
			usedElements.forEach(function( element ){
				console.log(element.innerHTML);
				element.style.cssText = '';
				element.id = '';
				//element.parentNode.removeChild(element);
				if ( element.placeholderEl ){
					element.parentNode.insertBefore( element.placeholderEl, element );
				}
				
				animationDoc.body.appendChild( element );
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
