(function ($) {
 "use strict";
		
	$('.mobile_memu nav').meanmenu({
		meanScreenWidth: "991",
		meanMenuContainer: ".mobile_memu",
	});

	/*---------------------
	 upcoming-product-list
	--------------------- */
	  $(".model_owl").owlCarousel({
	 
			autoPlay: false, //Set AutoPlay to seconds here					 
			items : 4,
			slideSpeed:600,
			rewindNav : false,
			itemsDesktop : [1169,3],
			itemsTablet: [991,2],
			itemsTabletSmall: [767,1],
			itemsMobile : [320,1],							  
			pagination : false,				 
			navigation : true,
			navigationText : ["<i class='fa fa-angle-left'></i>","<i class='fa fa-angle-right'></i>"]
	  });
    /*---------------------
	 upcoming-product-list
	--------------------- */
	  $(".newp_carsol").owlCarousel({
	 
			autoPlay: false, //Set AutoPlay to seconds here					 
			items : 1,
			slideSpeed:600,
			itemsDesktop : [1169,1],
			itemsTablet: [991,1],
			itemsTabletSmall: [767,1],
			itemsMobile : [320,1],							  
			pagination : false,				 
			navigation : false,
			rewindNav : false,
			navigationText : ["<i class='fa fa-angle-left'></i>","<i class='fa fa-angle-right'></i>"]
	  });
	/*---------------------
	 upcoming-product-list
	--------------------- */
	  $(".stock_owl").owlCarousel({
	 
			autoPlay: false, //Set AutoPlay to seconds here		
			slideSpeed:600,			
			items : 1,
			itemsDesktop : [1169,1],
			itemsTablet: [991,1],
			itemsTabletSmall: [767,1],
			itemsMobile : [320,1],							  
			pagination : false,				 
			navigation : true,
			rewindNav : false,
			navigationText : ["<i class='fa fa-angle-left'></i>","<i class='fa fa-angle-right'></i>"],
		});
	  /*---------------------
	 upcoming-product-list
	--------------------- */
	  $(".blog_carsol").owlCarousel({
	 
			autoPlay: false, //Set AutoPlay to seconds here					 
			items : 2,
			slideSpeed:600,
			itemsDesktopSmall : [1169,2],
			itemsTablet: [991,1],
			itemsTabletSmall: [767,1],
			itemsMobile : [320,1],							  
			pagination : false,				 
			navigation : false,
			rewindNav : false,
			navigationText : ["<i class='fa fa-angle-left'></i>","<i class='fa fa-angle-right'></i>"]
	  });
    /*---------------------
	 upcoming-product-list
	--------------------- */
	  $(".client_owl").owlCarousel({
	 
			autoPlay: true, //Set AutoPlay to seconds here					 
			items : 5,
			slideSpeed:600,
			//rewindNav : false,
			itemsDesktop : [1169,4],
			itemsTablet: [991,3],
			itemsTabletSmall: [767,2],
			itemsMobile : [479,1],							  
			pagination : false,				 
			navigation : false,
			navigationText : ["<i class='fa fa-angle-left'></i>","<i class='fa fa-angle-right'></i>"]
	  });	  

	/*---------------------
	 countdown
	--------------------- */
		$('[data-countdown]').each(function() {
		  var $this = $(this), finalDate = $(this).data('countdown');
		  $this.countdown(finalDate, function(event) {
			$this.html(event.strftime('<span class="cdown days"><span class="time-count">%-D</span> <p>Days</p></span> <span class="cdown hour"><span class="time-count">%-H</span> <p>Hour</p></span> <span class="cdown minutes"><span class="time-count">%M</span> <p>Min</p></span> <span class="cdown second"> <span><span class="time-count">%S</span> <p>Sec</p></span>'));
		  });
		});	
	// scroolup
	$.scrollUp({
		scrollText: '<i class="fa fa-angle-up"></i>',
		easingType: 'linear',
		scrollSpeed: 900,
		animation: 'fade'
	});			  
	/*---------------------
	 price slider
	--------------------- */  
	  $( "#slider-range" ).slider({
	   range: true,
	   min: 40,
	   max: 600,
	   values: [ 60, 570 ],
	   slide: function( event, ui ) {
		$( "#amount" ).val( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
	   }
	  });
	  $( "#amount" ).val( "$" + $( "#slider-range" ).slider( "values", 0 ) +
	   " - $" + $( "#slider-range" ).slider( "values", 1 ) );

	/*---------------------
	 collapse 
	--------------------- */ 
	$('.panel_heading a').on('click', function(){
		$('.panel_heading a').removeClass('active');
		$(this).addClass('active');
	})
	/*---------------------
	fancybox
	--------------------- */	
	$('.fancybox').fancybox();	
	/*---------------------
	counterUp
	--------------------- */	
	$('.about-counter').counterUp({
		delay: 10,
		time: 1000
	});	
/*----- main slider -----*/	
 $('#mainSlider').nivoSlider({
	directionNav: false,
	animSpeed: 500,
	slices: 18,
	pauseTime: 111115000,
	pauseOnHover: false,
	controlNav: true,	
	prevText: '<i class="fa fa-angle-left nivo-prev-icon"></i>',
	nextText: '<i class="fa fa-angle-right nivo-next-icon"></i>'
 });
 
	     
})(jQuery);    