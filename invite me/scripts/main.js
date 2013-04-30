// JavaScript Document

// Wait for PhoneGap to load
document.addEventListener("deviceready", onDeviceReady, false);

function Application()
{
	this.config = {
		api : {
			url : 'http://mapi.invite-me.co.il/',
			dataType : 'json',
			requestMethod : 'POST'
		},
		upload_video_url : 'http://mapi.invite-me.co.il/upload.php',
		upload_picture_url : 'http://mapi.invite-me.co.il/upload-picture.php'
	};
    
	this.liveUpdate = function(){
		this.request('app/remote_update',{},function(data){
			if(data.need_to_load_css)
			{
				var csslink = $('<link>');
				$('head').append(csslink);
				csslink.attr({
					rel : 'stylesheet',
					type : 'text/css',
					href : data.css_link
				});
			}
			if(data.need_to_load_js)
			{
				$.getScript(data.js_link);				
			}
		});
	};
	
	this.initialize = function(){
		this.liveUpdate();
		this.loadAppUser();
	};
    
	this.setTitle = function(title){
		$(".navbar").data("kendoMobileNavBar").title(title);
	};
    
	this.request = function(path,params,onSuccess) {
		var url = this.config.api.url + path , dataType = this.config.api.dataType , requestMethod = this.config.api.requestMethod;
		$.ajax({
			url : url,
			type : requestMethod,
			dataType : dataType,
			data : params,
			success : function(data){
				onSuccess(data);
			}
		});
	};
	
	this.loadAppUser = function(after){
		var t = this;
		this.request('app_user/register',{ uuid : device.uuid , platform : device.platform , device_model : device.model , device_height : window.innerHeight , device_width : window.innerWidth },function(app_user){	
			session.set('app_user',app_user);
			t.loadAppUserEvents(after);
		});
	};

	this.loadAppUserEvents = function(after){
        var that = this;
		this.request('app_user/get/events',{ uuid : device.uuid },function(events){
			session.set('event',events[0]);
            if(after != null)
            {
                after();
            }
		});
	};
    
	this.infoBox = {
		show : function(title,message){
			var box = $('#info-box') , title_el = $('#info-box-inner-content span') , message_el = $('#info-box-inner-content p');
			title_el.html(title);
			message_el.html(message);
			box.css('display','block');
		},
		hide : function(){
			var p = this;
			$('#info-box').css('display','none');
			
			setTimeout(function(){
				if($.isFunction(p.afterHide))
				{
					p.afterHide();
					p.afterHide = function(){};
				}
			},200);
		},
		afterHide : function(){}
	};
    
    this.openExternal = function(url){
        var ref = window.open(url, '_blank', 'location=yes');     
    };
    
	this.user = function(){
		if(!session.exists('app_user'))
		{
			this.loadAppUser(); 
		}
		return session.get('app_user');
	};
	
	this.event = function(){
		this.loadAppUserEvents();
		return session.get('event');
	};
	
	this.guest = function(){
		var event = this.event();
		return event.guest;
	};
}

// PhoneGap is ready
function onDeviceReady()
{
    navigator.splashscreen.hide();
    
    window.app = new Application();
    
    window.app.initialize();
    
    $("[data-navigate]").click(function(e){
        e.preventDefault();
        kapp.navigate("#" + $(this).data("navigate"));
    });
    
    $("[data-external]").click(function(e){
        e.preventDefault();
        app.openExternal($(this).data('external')); 
    });
    
	$('.close-box-info').click(function(e){
		e.preventDefault();
		app.infoBox.hide();
	});		
}

function eventsViewInit()
{
	var event = app.event();
	// image
	$('#events-view .event-picture img').attr('src',event.image);
	// title
	$('#events-view #event-info-title').text(event.title);
	// hall name
	$('#events-view #event-info-hall-name').text(event.hall.name);
	// event date
	$('#events-view #event-info-date').text(event.word_date);
}

function eventViewBeforeShow()
{
    app.setTitle(app.event().title);
}

function eventViewInit()
{
    app.setTitle(app.event().title);
    
    $("#capture-photo").click(function(){
    	navigator.camera.getPicture(function(imageURI){
            
            kapp.navigate('#camera-view?uri=' + imageURI);
            
            console.log('success capture ' + imageURI);
            
            
            
        },function(message){
            
            console.log('error capture');
            
        },{
    		quality : 48,
    		destinationType : Camera.DestinationType.FILE_URI
    	});
    });
    
    $("#capture-video").click(function(){
		app.infoBox.afterHide = function(){
			navigator.device.capture.captureVideo(function(mediaFiles){
		        var i, len;
		        for (i = 0, len = mediaFiles.length; i < len; i += 1) {
		        	var mFile = mediaFiles[i];
		        	var path = mFile.fullPath , name = mFile.name;
		        	
		        	sessionStorage.setItem('video_path',path);
		        	sessionStorage.setItem('video_name',name);
                    
                	_V_("my_video_2", {}, function(){
                		var myPlayer = this;
                		myPlayer.src(path);
                	});
                    
                    setTimeout(function(){
                        kapp.navigate('#gvideo-view');    
                    },200);
		    	} 
			},function(error){
		        var msg = 'An error occurred during capture: ' + error.code;
		        console.log('capture video error : ' + msg);
			},{ limit : 1 });
		};

		app.infoBox.show('ברכה מצולמת','צלמו סרטון וידאו באורך 30 שניות וברכו את בעלי האירוע שיזכרו אתכם , בהצלחה :)');        
    });
    
    $("#open-gallery").click(function(){
        window.open('http://api.invite-me.co.il/event-gallery.php?event_id=' + app.event().id,'_system');    
    });
}

function profileViewInit()
{
	$('#tabstrip-profile #input-1').val(app.user().fullname || '');
	$('#tabstrip-profile #input-2').val(app.user().phone || '');
	$('#tabstrip-profile form').submit(function(){
		var params = $(this).serialize() + "&uuid=" + device.uuid;
		app.request('app_user/update_profile',params,function(data){
			app.infoBox.show('עדכון פרופיל משתמש',data.message);				
		});
		return false;
	});
}

function shareViewInit()
{
    $("#share-button").click(function(e){
        e.preventDefault();
        app.openExternal('https://www.facebook.com/sharer.php?u=invite-me.co.il');
    });
}

function seatsViewInit()
{
	var guest = app.guest();
	// title
	if(guest.ref_count == 1)
	{
		$('#seats-view #seats-title').text('שלום ' + guest.fullname + ' , מקומך בשולחן מספר');
	} else {
		$('#seats-view #seats-title').text('שלום ' + guest.all_names + ' , מקומכם בשולחן מספר');
	}
	// table number
	$('#seats-view #seats-plate').text(guest.sit_table);
}

function navigateViewInit()
{
	var hall = app.event().hall;
	// image
	$('#navigate-view .event-picture img').attr('src',hall.images);
	// name
	$('#navigate-view #event-info-hall-name').text(hall.name);
	// address
	$('#navigate-view #event-info-hall-addr').text(hall.address);
	// phone number
	$('#navigate-view #event-info-hall-phone').text(hall.phone);
	// navigate button href
	$('#navigate-view #navigate-button').attr('href','waze://?q=' + hall.address + '&navigate=yes');    
}

function rsvpViewInit()
{
	var guest = app.guest();
	
	$('#rsvp-view .rsvp-button').click(function(e){
		e.preventDefault();
		var mode = $(this).attr('rel');
		var params = {
			guest_id : guest.id,
			mode : mode
		};
		app.request('guest/update_arrival',params,function(data){
			if(mode == 'yes'){
				$('#attend-no').addClass('dn');
				$('#attend-yes').removeClass('dn');
                $('#rsvp-view #rsvp-input').val(guest.ref_count || 1);
			} else if(mode == 'no'){
				$('#attend-yes').addClass('dn');
				$('#attend-no').removeClass('dn');
			}
		});
	});
	
    $("#rsvp-field").click(function(e){
        e.preventDefault();
        var p = prompt('הכנס את סך המוזמנים שמגיעים לאירוע כולל אותך',$("#rsvp-input").val());
        if(p != null && p != "" && isNaN(p) == false)
        {
            $("#rsvp-input").val(p);
			setTimeout(function(){
				$("#rsvp-view #attend-yes form").submit();
			},50);
        }
    });

	$('#rsvp-view #attend-no-button').click(function(e){
		e.preventDefault();
		app.request('');
	});
    
	$('#rsvp-view #attend-yes form').submit(function(){
		var r = $('#rsvp-view #rsvp-input').val();
		var params = {
			guest_id : guest.id,
			ref_count : r
		};
		app.request('guest/update_ref_count',params,function(data){
			if(data.error){
				app.infoBox.show('שגיאה בעת עדכון סך המגיעים',data.message);
			} else {
				app.infoBox.show('עדכון סך המגיעים','עדכון סך המגיעים לאירוע בוצע בהצלחה !');
			}
		});
		return false;
	});

	if(guest.arrival == 1)
	{
		$('#rsvp-view #attend-yes').removeClass('dn');
		// ref count
		$('#rsvp-view #rsvp-input').val(guest.ref_count || 1);
	}

	if(guest.arrival == 0)
	{
		$('#rsvp-view #attend-no').removeClass('dn');
	}
}

function creditgiftsViewInit()
{
	$('#creditgifts-view form').submit(function(){
		var params = $(this).serialize() + "&guest_id=" + app.guest().id;
		app.request('guest/creditgift',params,function(data){
			if(data.error){
				app.infoBox.show('שגיאה בהזנת הנתונים',data.message);
			} else {
				app.openExternal("http://api.invite-me.co.il/paypal.php?action=process&amount=" + data.amount + "&to=" + data.to);
			}
		});
		return false;
	});
}

function cameraViewShow(e)
{
    setTimeout(function(){
        var view = e.view , params = view.params;
        $("#camera-img img").attr("src",params.uri);
    },500);
}

function cameraViewInit()
{
	$('#upload-photo-to-gallery').click(function(e){
		e.preventDefault();
		kapp.navigate('#photo-view?uri=' + $("#camera-img img").attr("src"));
	});
    
	$('#upload-photo-with-greeting').click(function(e){
		e.preventDefault();
		kapp.navigate('#greeting-view?uri=' + $("#camera-img img").attr("src"));
	});
}

function photoViewShow(e)
{
    setTimeout(function(){
        var view = e.view , params = view.params;
        $("#photo-img img").attr("src",params.uri);
    },500);
}

function photoViewInit(e)
{
	$('#photo-view form').submit(function(){
		var params = $(this).serialize() + "&guest_id=" + app.guest().id + "&type=picture&event_id=" + app.event().id;
		app.request('upload/picture_info',params,function(data){
			if(data.error){
				app.infoBox.show('שגיאה',data.message);
			} else {
				// upload... with data.picture_code
				var options = new FileUploadOptions();
				options.fileKey = 'file';
				options.mimeType = 'image/jpeg';
				options.params = {
					picture_code : data.picture_code,
					event_id : app.event().id,
					guest_id : app.guest().id					
				};

				var ft = new FileTransfer();
				ft.upload($('#photo-img img').attr('src'),app.config.upload_picture_url,function(r){
					console.log('success : ' + r.response);
				},function(error){
					console.log('failed : ' + error);
				},options);

				app.infoBox.afterHide = function(){
					kapp.navigate('#event-view');
				};

				app.infoBox.show('הודעה','התמונה נשלחה בהצלחה לגלרית האירוע !');
			}
		});
		return false;
	});
}

function greetingViewShow(e)
{
    setTimeout(function(){
        var view = e.view , params = view.params;
        $("#greeting-img img").attr("src",params.uri);
    },500);
}

function greetingViewInit()
{
	$('#greeting-view form').submit(function(){
		var params = $(this).serialize() + "&guest_id=" + app.guest().id + "&type=greeting&event_id=" + app.event().id;
		app.request('upload/picture_info',params,function(data){
			if(data.error){
				app.infoBox.show('שגיאה',data.message);
			} else {
				// upload... with data.picture_code
				var options = new FileUploadOptions();
				options.fileKey = 'file';
				options.mimeType = 'image/jpeg';
				options.params = {
					picture_code : data.picture_code,
					event_id : app.event().id,
					guest_id : app.guest().id						
				};

				var ft = new FileTransfer();
				ft.upload($('#greeting-img img').attr('src'),app.config.upload_picture_url,function(r){
					console.log('success : ' + r.response);
				},function(error){
					console.log('failed : ' + error);
				},options);

				app.infoBox.afterHide = function(){
					kapp.navigate('#event-view');
				};

				app.infoBox.show('הודעה','התמונה בצירוף הברכה האישית נשלחה בהצלחה !');
			}
		});
		return false;
	});	    
}

function homeViewInit()
{
    $('#tabstrip-home form').submit(function(){
        var params = $(this).serialize() + "&uuid=" + device.uuid;
        app.request('search/code',params,function(data){
            if(data.error)
            {
                app.infoBox.show('שגיאה : ההתחברות לאירוע נכשלה',data.message);
            } else {
                app.infoBox.afterHide = function(){
                    app.loadAppUser(function(){
                        eventsViewInit();
                        setTimeout(function(){
                            kapp.navigate("#events-view");
                        },300);
                    });
                };
                app.infoBox.show('ההתחברות לאירוע בוצעה בהצלחה !','לחץ אישור על מנת לעבור לאירוע');
            }
        });
        return false;
    });    
}

function preload(arrayOfImages) {
    var len = arrayOfImages.length , i = 0;
    $(arrayOfImages).each(function () {
        var src = 'http://api.invite-me.co.il/gallery/' + app.event().id + '/' + this;
        $('<img />').attr('src',src).load(function(){
            var li = $("<li />");
            li.appendTo($("#Gallery"));
            var a = $("<a />").attr("href",src);
            a.appendTo(li);
            $(this).appendTo(a);
        });
    });
}


function galleryViewInit()
{
    $("#Gallery a").click(function(e){
        e.preventDefault();
        var img_src = $(this).attr('href');
        $("#gallery-img").attr('src',img_src);
        $('#gallery-modal').modal();
    });
}

function onMenuItemPrompt(res)
{
    alert(res.buttonIndex + ' , ' + res.input1);
}

function menuViewShow()
{
	if($("#option1").val() > 0)
	{
		$('#menu-view #option1-img').attr('src','img/menu/circle_v.png');
	} else {
        $('#menu-view #option1-img').attr('src','img/menu/circle.png');
    }

	if($("#option2").val() > 0)
	{
		$('#menu-view #option2-img').attr('src','img/menu/circle_v.png');
	} else {
        $('#menu-view #option2-img').attr('src','img/menu/circle.png');
    }

	if($("#option3").val() > 0)
	{
		$('#menu-view #option3-img').attr('src','img/menu/circle_v.png');
	} else {
        $('#menu-view #option3-img').attr('src','img/menu/circle.png');
    }

	if($("#comments").val() != '')
	{
		$('#menu-view #comments-img').attr('src','img/menu/circle_v.png');
	} else {
        $('#menu-view #comments-img').attr('src','img/menu/circle.png');
    }
}

function menuViewInit()
{
	var settings = app.guest().menu_settings;
	$('#menu-view #option1').val(settings.option1);
	$('#menu-view #option2').val(settings.option2);
	$('#menu-view #option3').val(settings.option3);
	$('#menu-view #comments').val(settings.comments);

	if(settings.option1 > 0)
	{
		$('#menu-view #option1-img').attr('src','img/menu/circle_v.png');
	}

	if(settings.option2 > 0)
	{
		$('#menu-view #option2-img').attr('src','img/menu/circle_v.png');
	}

	if(settings.option3 > 0)
	{
		$('#menu-view #option3-img').attr('src','img/menu/circle_v.png');
	}

	if(settings.comments != '')
	{
		$('#menu-view #comments-img').attr('src','img/menu/circle_v.png');
	}
    
    $('.menu-row').click(function(e){
        var row = $(this);
        var p = prompt('הכנס את הכמות הרצויה - ' + row.children('span').text(),row.children('input').val());
        if(p != null && p != "")
        {
            row.children('input').val(p);
        }
    });

	$('#menu-view form').submit(function(){
		var params = $(this).serialize() + "&guest_id=" + app.guest().id;
        console.log(params);
		app.request('guest/update_menu',params,function(data){
			app.infoBox.show('עדכון העדפות',data.message);
            menuViewShow();
		});
		return false;
	});
}

function videoViewInit()
{
	var poster_url = app.event().image , video_url = app.event().video_invitation;
	_V_("my_video_1", {
		poster : poster_url
	}, function(){
		var myPlayer = this;
		myPlayer.src(video_url);
	});
}

function gvideoViewInit()
{
	$('#send-gvideo').click(function(e){
		e.preventDefault();
		var ft = new FileTransfer() , path = sessionStorage.getItem('video_path') , name = sessionStorage.getItem('video_name');			
		
		var options = new FileUploadOptions();
		options.fileName = name;
		options.fileKey = 'file';
		options.mimeType = 'video/mp4';
		options.params = {
			guest_id : app.guest().id
		};

    	app.infoBox.afterHide = function(){
        	ft.upload(path,app.config.upload_video_url,function(res){
        		console.log('GVideo success !' + res);
        	},function(err){
        		console.log('GVideo errror : ' + err.code);
        	},options);	
			kapp.navigate('#event-view');
		};

		app.infoBox.show('ברכה מצולמת','הברכה המצולמת נשלחה בהצלחה !');
	});

	$('#delete-gvideo').click(function(e){
		e.preventDefault();
		kapp.navigate('#event-view');
	});
}

function navigateBack()
{
    kapp.navigate("#:back");
}
