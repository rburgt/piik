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
				sourceEl = this.sourceEl;
			
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
			 * create result element
			 */
			var resultEl = apply(this.resultEl = document.createElement('iframe'), {
				className : 'result'
			});
			resultEl.style.height = sourceEl.clientHeight + 'px';
			resultEl.style.width = sourceEl.clientWidth + 'px';
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
			
			// create an element with the same style as the editor
			// the with of the element will be used as the characters width
			this.characterEl = document.createElement('span');
			apply(this.characterEl.style, {
				cssText : getComputedStyle( this.sourceEl ).cssText,
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
			
			this.resultEl.contentDocument.documentElement.innerHTML = this.sourceEl.value
			this.resultEl.style.zIndex = 10;
			this.sourceEl.style.zIndex = 5;
		}
	} );
})( window, document );
