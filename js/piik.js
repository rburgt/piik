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
	};
	
	/**
	 * piik main class
	 */
	var piik = window.piik = function( targetId ){
		this.isEditing = true;
		this.sourceEl = document.getElementById( targetId );
		this.initLayout();
	};
	
	apply( piik.prototype, {
		
		/**
		 * create layout
		 */
		initLayout : function(){
			var _self = this;
			
			this.sourceEl
			
			/**
			 * main piik wrapper
			 */
			apply(this.piikEl = document.createElement('div'), {
				className : 'piik'
			});
			
			/**
			 * creates piik toggle button
			 */
			apply(this.toggleEl = document.createElement('button'), {
				className : 'aboe',
				innerHTML : 'piik aboe',
				onclick : function(){
					_self.aboe();
				}
			});
			this.piikEl.appendChild( this.toggleEl );
			
			/**
			 * create wrapper for source/result
			 */
			apply(this.wrapperEl = document.createElement('div'), {
				className : 'editWrapper'
			});
			this.piikEl.appendChild( this.wrapperEl );
			
			/**
			 * create result element
			 */
			apply(this.resultEl = document.createElement('iframe'), {
				className : 'result'
			});
			this.resultEl.style.height = this.sourceEl.clientHeight + 'px';
			this.resultEl.style.width = this.sourceEl.clientWidth + 'px';
			this.wrapperEl.appendChild( this.resultEl );
			
			/**
			 * transform visual dom
			 */
			this.sourceEl.parentNode.appendChild( this.piikEl );
			this.sourceEl.className = this.sourceEl.className + ' source'
			this.wrapperEl.appendChild( this.sourceEl );
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
