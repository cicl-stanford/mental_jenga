/* task.js
 * 
 * This file holds the main experiment code.
 * 
 * Requires:
 *   config.js
 *   psiturk.js
 *   utils.js
 */

// Create and initialize the experiment configuration object
var $c = new Config(condition, counterbalance);

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc);

// Preload the HTML template pages that we need for the experiment
psiTurk.preloadPages($c.pages);

// Objects to keep track of the current phase and state
var CURRENTVIEW;
var STATE;

/*************************™
 * INSTRUCTIONS         
 *************************/

 var Instructions = function() {
	
	$(".slide").hide();
	var slide = $("#instructions-training-" + $c.condition);
	slide.fadeIn($c.fade);

	slide.find('.next').click(function () {
		// physics_world.Start();
		CURRENTVIEW = new Practice();
		// CURRENTVIEW = new TestPhase();
		// CURRENTVIEW = new Comprehension();
	});
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*************************
 * PRACTICE
 *************************/

 var Practice = function(){

	$(".slide").hide();
	$("#practice").fadeIn($c.fade);

	var counter = 0;

	//Embed the physics world 
	html = '<iframe src="physics_world.html" width=800 height=600 id="game-frame"></iframe>';
	$('.physics_world_practice').html(html);

	var physics_world = document.getElementById('game-frame').contentWindow;
	$('#continue').prop('disabled',true)

	 $('#simulate').click(function () {
		var simulation_finished = 0
		if (counter < 8) {
			physics_world.loadClip('snapshot', counter, true, true);
		} else {
			physics_world.animateHigh();
		}
		$('#simulate').prop('disabled',true)
		counter++;
		if (counter == 5){
			$('#continue').prop('disabled',false)
		}
		});

	  $('#continue').click(function () {
		CURRENTVIEW = new TestPhase();
		});
  }


/*************************
 * TRIAL
 *************************/

 var TestPhase = function(){

	var that = this;

	// Initialize a new trial. This is called either at the beginning
	// of a new trial, or if the page is reloaded between trials.
	this.init_trial = function () {
		// If there are no more trials left, then we are at the end of
		// this phase
		if (STATE.index >= $c.trials.length) { //change here for debugging
			this.finish();
			return false;
		}

		// Load the new trialinfo
		this.trialinfo = $c.trials[STATE.index];

		// debugger
		// Update progress bar
		update_progress(STATE.index, $c.trials.length);

		return true;
	}; 


	this.display_stim = function (that) {

		if (that.init_trial()) {
			var html = "" ; 
			// Image 
			html = '<img src  = "static/images/stimuli/' + this.trialinfo.image + '.png" id = "tower_image">'
			$('.stimulus_image').html(html);

			$(function() { 
			  $("#tower_image").width(800).height(600);
			});

			html = "" ;
			// Questions
			for (var i=0; i<1; i++) {
				var q = $c.questions[$c.condition].q;
				html += '<p class=".question">' + q +'</p><div class="s-'+i+'"></div><div class="l-'+i+'"></div><br /><br/>' ;
			}
			$('#question_container').html(html) ;
			
			nbricks = this.trialinfo.bricks;

			//slider 
			// for (var i=0; i<2; i++) {
				// Create the sliders
				if ($c.condition == 0) {
					$('.s-'+0).slider({min:0,max:nbricks}).on("slidestart", function( event, ui ) {
						// Show the handle
						$(this).find('.ui-slider-handle').show() ;

						// Sum is the number of sliders that have been clicked
						var sum = 0 ;
						for (var j=0; j<1; j++) {
							if ($('.s-'+j).find('.ui-slider-handle').is(":visible")) {
								sum++ ;
							}
						}
						if (sum == 1) {
							$('#trial_next').prop('disabled', false) ;
						}
					});
					//labels
					for (var j = 0; j <= nbricks; j++) {
						$('.s-'+0).append("<label style='left:"+ j * 100.0/(nbricks) + "%'>" + j + "</label>");     
					}
				}

				if ($c.condition == 1) {
					$('.s-'+0).slider().on("slidestart", function( event, ui ) {
						$(this).find('.ui-slider-handle').show() ;
						var sum = 0 ;
						for (var j=0; j<1; j++) {
							if ($('.s-'+j).find('.ui-slider-handle').is(":visible")) {
								sum++ ;
							}
						}
						if (sum == 1) {
							$('#trial_next').prop('disabled', false) ;
						}
					});
					$('.s-'+0).append("<label style='margin-left:-50px;width:100px;left:"+ 0 + "%'>not at all</label>");
					$('.s-'+0).append("<label style='margin-left:-50px;width:100px;left:"+ 100 + "%'>very much</label>");
				}	
			// }

			// Hide all the slider handles 
			$('.ui-slider-handle').hide() ;            
			
			$('#trial_next').prop('disabled', true);
		}       
	};

	this.record_response = function() {      
		var response =  $('.s-'+0).slider('value');   

		psiTurk.recordTrialData(['id', this.trialinfo.ID, 'image', this.trialinfo.image, 'judgment', response]);
		STATE.set_index(STATE.index + 1);

		// Update the page with the current phase/trial
		this.display_stim(this);
	};

	this.finish = function() {
		CURRENTVIEW = new Comprehension();
	};

	// Load the trial html page
	$(".slide").hide();

	// Show the slide
	var that = this; 
	$("#trial").fadeIn($c.fade);
	$('#trial_next.next').click(function () {
		that.record_response();
	});

	// Initialize the current trial
	if (this.init_trial()) {
		// Start the test
		this.display_stim(this) ;
	};
}

/*****************
 *  COMPREHENSION CHECK QUESTIONS*
 *****************/

 var Comprehension = function(){

	var that = this; 

// Show the slide
$(".slide").hide();
$("#comprehension").fadeIn($c.fade);

	//disable button initially
	$('#trial_continue').prop('disabled', true);

	//checks whether all questions were answered
	$('.demoQ').change(function () {
	 if ($('input[name=color]:checked').length > 0)
	 {
		$('#trial_continue').prop('disabled', false)
	}else{
		$('#trial_continue').prop('disabled', true)
	}
});

	$('#trial_continue').click(function () {           
	   var color = $('input[name=color]:checked').val();
	   
	   psiTurk.recordUnstructuredData('color',color);

	   CURRENTVIEW = new Demographics();
   });
};


/*****************
 *  DEMOGRAPHICS*
 *****************/

 var Demographics = function(){

	var that = this; 

// Show the slide
$(".slide").hide();
$("#demographics").fadeIn($c.fade);

	//disable button initially
	$('#trial_finish').prop('disabled', true);

	//checks whether all questions were answered
	$('.demoQ').change(function () {
	   if ($('input[name=sex]:checked').length > 0 &&
		 $('input[name=age]').val() != "")
	   {
		$('#trial_finish').prop('disabled', false)
	}else{
		$('#trial_finish').prop('disabled', true)
	}
});

// deletes additional values in the number fields 
$('.numberQ').change(function (e) {    
	if($(e.target).val() > 100){
		$(e.target).val(100)
	}
});

this.finish = function() {
	debug("Finish test phase");

		// Show a page saying that the HIT is resubmitting, and
		// show the error page again if it times out or error
		var resubmit = function() {
			$(".slide").hide();
			$("#resubmit_slide").fadeIn($c.fade);

			var reprompt = setTimeout(prompt_resubmit, 10000);
			psiTurk.saveData({
				success: function() {
					clearInterval(reprompt); 
					finish();
				}, 
				error: prompt_resubmit
			});
		};

		// Prompt them to resubmit the HIT, because it failed the first time
		var prompt_resubmit = function() {
			$("#resubmit_slide").click(resubmit);
			$(".slide").hide();
			$("#submit_error_slide").fadeIn($c.fade);
		};

		// Render a page saying it's submitting
		psiTurk.showPage("submit.html") ;
		psiTurk.saveData({
			success: psiTurk.completeHIT, 
			error: prompt_resubmit
		});
	}; //this.finish function end 

	$('#trial_finish').click(function () {           
	   var feedback = $('textarea[name = feedback]').val();
	   var sex = $('input[name=sex]:checked').val();
	   var age = $('input[name=age]').val();

	   psiTurk.recordUnstructuredData('feedback',feedback);
	   psiTurk.recordUnstructuredData('sex',sex);
	   psiTurk.recordUnstructuredData('age',age);
	   that.finish();
   });
};


// --------------------------------------------------------------------

/*******************
 * Run Task
 ******************/

 $(document).ready(function() { 
	// Load the HTML for the trials
	psiTurk.showPage("trial.html");

	// Record various unstructured data
	psiTurk.recordUnstructuredData("condition", condition);
	psiTurk.recordUnstructuredData("counterbalance", counterbalance);

	// Start the experiment
	STATE = new State();
	// Begin the experiment phase
	if (STATE.instructions) {
		CURRENTVIEW = new Instructions();
	}
});
