/**
 * axue_shine.js v1.3
 * jQuery Magic cursor animation
 * Author: Ax. Adarsh Pawar (bug fix, independent instances, new features)
 * Inspired by jquery-stars (Alexander Prokopenko) https://github.com/justcoded/jquery-stars/
 * Copyright (c) 2024 Ax. Adarsh Pawar - released under MIT License
 */

(function($) {

    $.jstars = {};
    $.fn.jstars = function(methodOrOptions) {
        if (typeof methodOrOptions === 'object' || !methodOrOptions) {
            // Default method
            return init.apply(this, arguments);
        } else if ($.fn.jstars.methods[methodOrOptions]) {
            return $.fn.jstars.methods[methodOrOptions].apply(this, Array.prototype.slice.call(arguments, 1));
        } else {
            $.error('Method ' + methodOrOptions + ' does not exist on jQuery.jstars');
        }
    };
  
    function init(settings) {
        // check IE. only IE9+ support
        var ua = window.navigator.userAgent,
            msie = ua.indexOf("MSIE ");
        if (msie > 0) {
            if (parseInt(ua.substring(msie + 5, ua.indexOf(".", msie))) < 9) return;
        }
  
        // apply default params
        settings = $.extend({}, $.fn.jstars.defaults, settings);
        // define frequency
        settings.frequency = 20 - Math.max(1, Math.min(settings.frequency, 19));
  
        return this.each(function() {
            var $this = $(this);
            
            var jstar_timer = null;
            var jstar_index = 0;
            var jstar_dindex = 0;
            var jstar_image = null;
            var jstar_id = 'jstar_span_' + (new Date().getTime()) + '_' + Math.floor(Math.random() * 1000);
  
            // preprocess
            if (!jstar_timer) {
                // timer function
                var jstar_uptade_star_bg = function() {
                    if (!$('span.jstar_span').length) return;
    
                    $('span.jstar_span.' + jstar_id).each(function() {
                        var bg_pos = $(this).css('background-position').split(' ');
                        var bg_pos_x = parseInt(bg_pos[0]);
                        var bg_pos_y = parseInt(bg_pos[1]);
                        $(this).css('background-position', (bg_pos_x - settings.width) + 'px ' + bg_pos_y + 'px');
                    });
                };
                
                // init timer
                jstar_timer = setInterval(jstar_uptade_star_bg, settings.delay / 9);
                // init image
                jstar_image = new Image();
                jstar_image.src = settings.image_path + '/' + settings.image;
            }
  
            //check if cursor widget is visible
            function isCursorWidgetVisible(){
              var widgetId = settings.widgetId;
              var objWidget = $("#"+widgetId+".ue_cursor-wrap[data-cursor='cursor-3']");
               
              if(objWidget.is(":visible") == false)
                  return(false)
              else
              return(true)
  
            }
            
            // hover event
            function hoverEvent(e) {
              var isVisible = isCursorWidgetVisible();
             
              if(isVisible == true)
              $(document.body).append(span);
              else
              return(true)
  
                if ((jstar_dindex++ % settings.frequency) != 0) return;
    
                var maxViewportX = $(window).width() - settings.width - 10;
                
                // define what side we need to show stars:
                var sideX = jstar_rand(-1, 1);
                var sideY = jstar_rand(-1, 1);
                
                var randX = jstar_rand(5, 30);
                var randY = jstar_rand(5, 30);
                
                var opacity = Math.min(Math.random() + 0.4, 1);
                
                // calculate coordinate
                var touch, pageX, pageY;
    
                if (e.touches) {
                    touch = e.touches[0];
                    pageX = touch.pageX;
                    pageY = touch.pageY;
                }else{
                    pageX = e.pageX;
                    pageY = e.pageY;
                }
    
             
                if(pageX != undefined)
                pageX = pageX - (settings.width / 2);
  
                if(pageY != undefined)
                pageY = pageY - (settings.height / 2);
                
                // Ensure stars are generated within the viewport bounds
                var x = Math.min(Math.max(pageX + (sideX * randX), 0), maxViewportX);
                var y = pageY + (sideY * randY);
                
                // show span and launch animate
                var id = 'jstar_' + jstar_index++;
                
                // append style
                var bg_pos;
                if (settings.style != 'rand') {
                    bg_pos = '0px ' + settings.style_map[settings.style] + 'px';
                } else {
                    var ind = jstar_rand(0, 5);
                    var i = 0;
                    for (var key in settings.style_map) {
                        if (i++ == ind) {
                            bg_pos = '0px ' + settings.style_map[key] + 'px';
                            break;
                        }
                    }
                }
                
                var span = '<span id="' + id + '" class="jstar_span ue_cursor-item ue_cursor-item--3' + jstar_id + '" style="display:block; width:' + settings.width + 'px; height:' + settings.width + 'px; background:url(' + jstar_image.src + ') no-repeat ' + bg_pos + '; margin:0; padding:0; position:absolute;z-index:999999; top:-50px; left:0; pointer-events: none; touch-action: auto; transform: scale(' + settings.ue_scale + ');">&nbsp;</span>';
                var isVisible = isCursorWidgetVisible();
              
                if(isVisible == true)
                $(document.body).append(span);
                else
                return(true)
    
                var star = $('#' + id);
                star
                    .css({
                        top: y,
                        left: x,
                        'opacity': opacity,
                    })
                    .animate({ opacity: 0 }, {
                        duration: settings.delay,
                        step: function(now, fx) {
                            if (fx.prop === 'opacity') {
                                var scale = settings.ue_scale + (settings.ue_end_scale - settings.ue_scale) * (1 - now);
                                $(this).css('transform', 'scale(' + scale + ')');
                            }
                        },
                        complete: function() {
                            star.remove();
                        }
                    });
            }
    
            $this.data('jstars', {
                settings: settings,
                jstarId: jstar_id,
                jstarTimer: jstar_timer,
                jstarHoverEvent: hoverEvent
            });
    
            if ('ontouchmove' in window) {
                $this.on('touchmove', hoverEvent);
    
                if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    $this.on('mousemove', hoverEvent);
                }
            } else {
                $this.on('mousemove', hoverEvent);
            }
        });
    }
  
    $.fn.jstars.methods = {
        destroy: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data('jstars');
                if (data) {
                    if (data.jstarTimer) {
                        clearInterval(data.jstarTimer);
                    }
                    if (data.jstarHoverEvent) {
                        $this.off('mousemove', data.jstarHoverEvent);
                        $this.off('touchmove', data.jstarHoverEvent);
                    }
                    $('span.' + data.jstarId).remove();
                    $this.removeData('jstars');
                }
            });
        }
    };
    
    /**
     * helper functions
     */
    
    // math rand in interval
    function jstar_rand(from, to) {
        var r = Math.random();
        r = r * (to - from);
        r = r + from;
        r = Math.round(r);
        return r;
    }
    
    $.fn.jstars.defaults = {
        image_path: '', // this is required param
        image: 'jstar-modern.png', // this is required param
        style: 'white',
        frequency: 12,
        style_map: {
            white: 0,
            blue: -25,
            green: -50,
            red: -75,
            yellow: -100
        },
        width: 25,
        height: 25,
        delay: 500,
        ue_scale: 1,
        ue_end_scale: 1
    };
  
  })(jQuery);
  