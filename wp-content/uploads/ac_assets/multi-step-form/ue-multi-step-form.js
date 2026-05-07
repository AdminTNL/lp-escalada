  function ueMultiStepForm(){
    
    //classes
    var g_classConnected, g_classActive, g_firstStepClass, g_errorClass,
    g_conditionsClass, g_doneClass, g_visibleClass, g_invisibleClass, g_ueLoadingClass, g_emptyFieldClass;
    
    //selectors
    var g_templateSelector, g_multiStepItemSelector, g_fieldSelector,
    g_elementorWidgetParentSelector, g_errorSelector, g_objStepIndicators, g_doneIconSelector, 
    g_stepIconSelector, g_stepIconItemSelector, g_loaderSelector, g_progressBarSelector,
    g_progressBarInnerSelector, g_multiStepProgressBarNumbersSelector;
    
    //objects
    var g_objMultiStepWidget, g_objMultiStepItems, g_objNextBtn, g_objPrevBtn, g_objSubmitBtn,
    g_objOwlCarousel, g_objOwlCarouselItems, g_objSubmitButtonWidget, g_stepIndicatorClassActive, 
    g_objIconsContainer, g_objLoader, g_objProgressBar, g_objProgressBarInner, g_objMultiStepProgressBarNumbers;
    
    //external functions
    var g_submitButtonApi;
    
    //data attrs
    var g_isInEditor;
    
    //helpers
    var g_activeStepIndex, g_stepsNum;
    
    /*
    * apply template's styles to multi steps elements 
    */
    function setTemplateStyle(){    
      var objTemplate = g_objMultiStepWidget.find(g_templateSelector);
      
      if(!objTemplate.length)
        return(false);
      
      var objLayoutClass = objTemplate.attr("class");    
      g_objMultiStepWidget.addClass(objLayoutClass);    
    }
    
    /*
    * clone elements and append to items
    */
    function findSectionsOnFrontPage(objMultiStepItem, sectionToClone){         
      //clone section - use detach method on front to make elementor widgets work
      var clonedSectionItem = sectionToClone.detach();
      
      //paste section
      objMultiStepItem.html(clonedSectionItem);
      
      //add connected class to item child element
      var objMultiStepItemSection = objMultiStepItem.children();    
      objMultiStepItemSection.addClass(g_classConnected);    
    }
    
    /*
    * show what sections are connected in editor
    */
    function findSectionsInEditor(objMultiStepItem){         
      //cloned section's id
      var objMultiStepItemId = objMultiStepItem.data("element-id");
      
      //item message in editor
      var itemHtml = "<div class='uc-message-success'>Section with id <b>'" + objMultiStepItemId + "'</b> connected to Multi Step Form</div>";
      
      //paste section
      objMultiStepItem.html(itemHtml);    
    }
    
    /*
    * handle errors
    */
    function showHideErrors(objMultiStepItem, multiStepItemId, sectionToClone) {    
      var showErrors = g_objMultiStepWidget.data("errors");
      
      if(showErrors == false)
        return(false);
      
      //check if element with id from multi step form item exist
      if(sectionToClone.length > 0)
        return(false);
      
      //if element does not exist, then add error class to multi step form item
      objMultiStepItem.addClass("uc-item-error");
      
      //add error html element
      var errorHtml = "<div class='uc-section-error'><div class='uc-error'>Couldn't find a section with id: '" + multiStepItemId + "'</div></div>";
      
      objMultiStepItem.html(errorHtml);    
    }
    
    
    /*
    * debug items id
    */
    function showHideIds(){    
      var debugId = g_objMultiStepWidget.data("items-id");
      
      if (debugId == false)
        return(false);
      
      //show all items id
      var availableIdListClass = "available-item-id-s-list";
      var itemsIdHtml = "<div class='available-id-s'>Item Id's List<ul class="+availableIdListClass+"></ul></div>";
      
      g_objMultiStepWidget.append(itemsIdHtml);
      
      var objItemIdList = g_objMultiStepWidget.find("."+availableIdListClass);
      
      for(let i = 0; i <= g_stepsNum - 1; i++){
        
        var objItem = g_objMultiStepItems.eq(i);
        var objItemId = objItem.data("element-id");
        
        //if data-id attribute is empty, skip and go to next data-id
        if(!objItemId)
          continue;
        else
        objItemIdList.append("<li>"+objItemId+"</li>");      
      }
    }
    
    /*
    * show | hide удуьутеі in editor
    */ 
    function hideSectionInEditor(sectionToClone){    
      if(g_isInEditor == false)
        return(false);
      
      //affect only section that are not connected
      if(sectionToClone.hasClass(g_classConnected) == true)
        return(false);
      
      var dataShowInEditor = g_objMultiStepWidget.data('show-section');
      
      if(dataShowInEditor == 'no')
        sectionToClone.css('display', '');
      
      if(dataShowInEditor == 'message' || dataShowInEditor == 'hide')
        sectionToClone.hide();    
    }
    
    /*
    * debug elements id
    */
    function showHideElementsIds(){    
      var debugElementsId = g_objMultiStepWidget.data("elements-id");
      
      if (debugElementsId == false)
        return(false);
      
      //show list of elements's ids that can be connected to items
      var listClass = "available-section-id-s-list";
      var elementsListHtml = "<div class='available-id-s'>Section Id's List<ul class="+listClass+"></ul></div>";
      
      g_objMultiStepWidget.append(elementsListHtml);
      
      var objSectionIdList = g_objMultiStepWidget.find("."+listClass);
      var objAvailableSections = jQuery('section'); //shows only sections, but not divs
      
      objAvailableSections.each(function(){
        
        var objSectionItem = jQuery(this);
        var objSectionItemId = objSectionItem.attr('id');
        var objSectionItemDisplay = objSectionItem.css('display');
        
        //watch only those sections that are displayed on the page
        if(objSectionItemDisplay == 'none')
          return(true);
        
        //if id attribute is empty, skip and go to next id
        if(!objSectionItemId)
          return(true);
        
        //check if sections are connected to items
        if(objSectionItem.hasClass(g_classConnected) == true)
          return(true);
        
        //add section's id to the list
        if(objSectionItem.hasClass(g_classConnected) == false)
          objSectionIdList.append("<li>"+objSectionItemId+"</li>");      
      });
    }
    
    /*
    * define source type "element id" behaviour on live page
    */
    function handleItemTypeSection(){
      
      g_objMultiStepItems.each(function(){      
        var objMultiStepItem = jQuery(this);
        var multiStepItemId = objMultiStepItem.data("element-id");
        
        //find elements to clone on the page
        var sectionToClone = jQuery("#"+multiStepItemId);
        
        //set template's style for multi step form
        setTemplateStyle();
        
        //clone and paste element from elementor layout
        findSectionsOnFrontPage(objMultiStepItem, sectionToClone);  
        
        //see if multi step form item id has its element on the page
        showHideErrors(objMultiStepItem, multiStepItemId, sectionToClone);      
      }); 
      
      //handle debug mode   
      showHideIds();
      showHideElementsIds();    
    }  
    
    /*
    * define item type "section" behaviour in editor
    */
    function handleItemTypeSectionInEditor(){    
      g_objMultiStepItems.each(function(){
        
        var objMultiStepItem = jQuery(this); 
        var multiStepItemId = objMultiStepItem.data("element-id");
        
        //find sections to clone on the page
        var sectionToClone = jQuery("#"+multiStepItemId);
        
        //tell to user which section is connected
        findSectionsInEditor(objMultiStepItem);
        
        //see if item id has its element on the page
        showHideErrors(objMultiStepItem, multiStepItemId, sectionToClone);
        
        //show | hide sections if needed
        hideSectionInEditor(sectionToClone);
        
      }); 
      
      //handle debug mode   
      showHideIds();
      showHideElementsIds();    
    }
    
    /**
    * set active step
    */
    function setActiveStep(objStep){    
      g_objMultiStepItems.removeClass(g_classActive);
      
      objStep.addClass(g_classActive);
      
      //set indicator
      setCurrentStep();
      
      //set done steps
      setDoneSteps();    
    }
    
    /**
    * cancel hide (do not use show() in case obj is display flex)
    */
    function showObject(obj){    
      obj.css("display", "");    
    }
    
    /**
    * show hide buttons
    */
    function showHideButtons(){    
      //if last step is active - hide next btn and show submit btn
      if(g_activeStepIndex + 1 == g_stepsNum){
        
        g_objNextBtn.hide();      
        g_objSubmitBtn.css("display", "flex"); // use show because in css prev button set to display none by default      
      }
      
      //if index is last one - show next btn and hide submit btn
      if(g_activeStepIndex < g_stepsNum - 1){ 
        
        g_objSubmitBtn.hide();      
        showObject(g_objNextBtn);      
      }
      
      if(g_activeStepIndex != 0)
        g_objPrevBtn.show(); // use show because in css prev button set to display none by default
      
      //if first step is active - hide prev btn
      if(g_activeStepIndex == 0)      
        g_objPrevBtn.hide();    
    }

    /**
    * scroll to top
    */
    function scrollToTop(obj, num){
      var offsetTop = obj.offset().top;
      
      jQuery("html").animate({ scrollTop: (offsetTop + num) }, 500);
    }

    /**
     * scroll to top after step change
     */
    function scrollToTopAfterStepChange(){
      var dataScrollToTop = g_objMultiStepWidget.data("scrolltotop");

      if(dataScrollToTop == false)
        return(false);

      var dataOffset = g_objMultiStepWidget.data("scrolltoptop-offset");

      scrollToTop(g_objMultiStepWidget, dataOffset);
    }
    
    /**
    * on next button click
    */
    function onNextStepClick(){    
      setTimeout(showFirstNotVerifiedStep,100); 
      
      //see if any required fields are included and empty (an error will be thrown if such fields exists)
      var isFieldWidgetsVerified = isFieldsVerified(true);
      
      if(isFieldWidgetsVerified == false && g_isInEditor == "no"){
        return(false);
      }
      
      //switch carousel slide
      g_objOwlCarousel.trigger("next.owl.carousel");
      
      if(g_activeStepIndex != 0)
        g_allBtnWrapper.removeClass(g_firstStepClass);
      
      setCurrentStep();     
      setDoneSteps();        
      scrollToTopAfterStepChange();
    }
    
    /**
    * on prev button click
    */
    function onPrevStepClick(){    
      //switch carousel slide
      g_objOwlCarousel.trigger("prev.owl.carousel");
      
      if(g_activeStepIndex == 0)  
        g_allBtnWrapper.addClass(g_firstStepClass);
      
      setCurrentStep();    
      setDoneSteps();  
      scrollToTopAfterStepChange();  
    }
    
    /**
    * find Submit Button widget or show error
    */
    function showNoSubmitButtonError(){    
      var errorHtml = '<div class="ue-error">No Submit Button Widget found. Please add Submit Button Widget on the page.</div>';    
      g_objMultiStepWidget.prepend(errorHtml);    
    }
    
    /**
    * validate Submit Button
    */
    function validateSubmitButton(){    
      if(!g_objSubmitButtonWidget || g_objSubmitButtonWidget.length == 0)
        showNoSubmitButtonError();    
    }
    
    /**
    * get first not verified step index
    */
    function getFirstNotVerifiedStepIndex(){
      var objErrors = g_objMultiStepWidget.find("."+g_emptyFieldClass);
      
      if(!objErrors || objErrors.length == 0)
        return(null);
      
      var notVerifiedStepArray = [];
      
      objErrors.each(function(){
        var objError = jQuery(this);
        var objParentOwlItem = objError.parents(".owl-item");
        
        notVerifiedStepArray.push(objParentOwlItem);
      });
      
      var objFirstNotVerifiedStep = notVerifiedStepArray[0];
      
      if(!objFirstNotVerifiedStep || objFirstNotVerifiedStep.length == 0)
        return(null);
      
      var firstNotVerifiedStepIndex = objFirstNotVerifiedStep.index();
      return(firstNotVerifiedStepIndex);
    }
    
    /*
    * show first not verified step
    */
    function showFirstNotVerifiedStep(){    
      var firstNotVerifiedStepIndex = getFirstNotVerifiedStepIndex();
      
      if(firstNotVerifiedStepIndex == null)
        return(false);
      
      g_objOwlCarousel.trigger('to.owl.carousel', [firstNotVerifiedStepIndex, 500, true]);    
    }
    
    /**
    * on submit button click
    */
    function onSubmitBtnClick(){    
      if(!g_objSubmitButtonWidget)
        return(false);
      
      var objSubmitButton = g_objSubmitButtonWidget.find("button");
      
      //check if fields are verified / if not show first not verified step
      setTimeout(function(){
        var isAllFieldsVerivied = isFieldsVerified(false);
        
        if(isAllFieldsVerivied == false){
          showFirstNotVerifiedStep();      
          return(false);
        }
        
        
        objSubmitButton.trigger("click");
        
        //add some class to the current button
        jQuery(this).addClass(g_classActive);
        
        //add some loading class to the current button
        g_objLoader.addClass(g_ueLoadingClass);    
        
      },500);
    }
    
    /**
    * get active step object
    */
    function getCurrentStepObject(){
      var objActiveStep;
      
      if(g_activeStepIndex == 0)
        objActiveStep = g_objOwlCarouselItems.eq(0).find(g_multiStepItemSelector);
      else
      objActiveStep = g_objOwlCarouselItems.eq(g_activeStepIndex-1).find(g_multiStepItemSelector);
      
      return(objActiveStep);    
    }
    
    /**
    * on next carousel event
    */
    function onNextOwlCarouselEvent(){
      
      //see if any required fields are included and empty
      var isFieldWidgetsVerified = isFieldsVerified(false);
      
      // if(isFieldWidgetsVerified == false && g_isInEditor == "no"){
      //   g_objOwlCarousel.trigger('prev.owl.carousel');
      
      // }
    }
    
    /*
    *  consider carousel change with remote widgets
    */ 
    function onCarouselChange(event){       
      var currentIndex = event.item.index;
      
      g_activeStepIndex = currentIndex;
      
      updateProgressBar();
      
      showHideButtons();
      
      var objActiveStep = g_objOwlCarouselItems.eq(g_activeStepIndex).find(g_multiStepItemSelector);    
      setActiveStep(objActiveStep);    
    }
    
    /**
    * increase height of carousel stage element
    */
    function adjustOwlStageHeight(isGrow){
      var objStage = g_objMultiStepWidget.find(".owl-stage-outer");
      
      if(!objStage || objStage.length == 0)
        return(false);
      
      var stageHeight = objStage.height();
      var stageMinHeight = stageHeight + 50;
      
      if(isGrow == true){
        window.dispatchEvent(new Event('resize'));
        objStage.css('min-height', stageMinHeight+"px");
      }
      
      if(isGrow == false){
        objStage.css('min-height', "");
      }
    }
    
    /*
    * verify fields
    */
    function isFieldsVerified(throwError){    
      if(g_isInEditor == "yes")
        return(false);
      
      var objCurrentStep = getCurrentStepObject();
      var objFields = objCurrentStep.find(g_fieldSelector);
      var isVerified = true;
      
      //if no field found on the page then exit function (allows using multistepform without fields)
      if(!objFields.length)
        return(false);
      
      objFields.each(function(el, index){
        var objField = jQuery(this);
        
        //skip field if not verified - fields with conditions only can be skipped (also checks if some required fields are empty and throws an error)
        if(g_submitButtonApi.isVerified(objField, g_conditionsClass, throwError) == false){
          
          //do not throw error if next step is triggered by next.owl.carousel event
          if(throwError == true){
            return(true);
          } else{
            isVerified = false;
            return(false)
          }
          
        }else{
          
          //if all verifications are passed remove empty required field errors
          g_submitButtonApi.removeErrors(g_fieldSelector, g_elementorWidgetParentSelector, g_errorClass);
          
          //adjust owl stage height after removing error element
          adjustOwlStageHeight(false);
          // return(false);
        }      
      });
      
      //if all verifications are passed return true
      return(isVerified);    
    }
    
    /**
    * set done icon
    */
    function setDoneIcon(objStepIndicator){    
      var objDoneIcon = objStepIndicator.find(g_doneIconSelector);
      
      if(!objDoneIcon || objDoneIcon.length == 0)
        return(false);
      
      objDoneIcon.addClass(g_visibleClass);   
      
      var objGraphicElement = objStepIndicator.find(g_stepIconItemSelector);
      
      if(objGraphicElement)
        objGraphicElement.addClass(g_invisibleClass);  
    }
    
    /**
    * remove done icon
    */
    function removeDoneIcon(objStepIndicator){    
      var objDoneIcon = objStepIndicator.find(g_doneIconSelector);
      
      if(!objDoneIcon || objDoneIcon.length == 0)
        return(false);
      
      objDoneIcon.removeClass(g_visibleClass);
      
      var objGraphicElement = objStepIndicator.find(g_stepIconItemSelector);
      
      if(!objGraphicElement)
        return(false);
      
      objGraphicElement.removeClass(g_invisibleClass);       
    }
    
    /**
    * set done indicators
    */
    function setDoneSteps(){   
      if(!g_objStepIndicators)
        return(false);
      
      g_objStepIndicators.each(function(index, step){      
        var objStepIndicator = jQuery(this);
        
        if(index < g_activeStepIndex){    
          
          objStepIndicator.addClass(g_doneClass);        
          setDoneIcon(objStepIndicator);        
        }else{   
          
          objStepIndicator.removeClass(g_doneClass);        
          removeDoneIcon(objStepIndicator);
        }      
      });    
    }
    
    /**
    * add current indicator
    */
    function setCurrentStep(){    
      if(!g_objStepIndicators)
        return(false);
      
      g_objStepIndicators.removeClass(g_stepIndicatorClassActive);
      
      g_objStepIndicators.eq(g_activeStepIndex).addClass(g_stepIndicatorClassActive);    
    }
    
    /**
    * init Submit Button class 
    */
    function initSubmitButton(){    
      g_submitButtonApi = new ueSubmitButton();    
    }
    
    /**
    * update multistep progressbar number
    */
    function updateProgressStepNumber(){
      if(!g_objMultiStepProgressBarNumbers || g_objMultiStepProgressBarNumbers.length == 0)
        return(false);
      
      var progressNumber = g_activeStepIndex + 1 + "/" + g_stepsNum;
      g_objMultiStepProgressBarNumbers.text(progressNumber);
    }
    
    /**
    * update progress bar
    */
    function updateProgressBar(){
      if(!g_objProgressBar || g_objProgressBar.length == 0)
        return(false);
      
      var totalBarWidth = g_objProgressBar.width();
      var singleStepGrow = Math.round(totalBarWidth / g_stepsNum);
      
      g_objProgressBarInner.css("width", (g_activeStepIndex + 1) * singleStepGrow+"px");
      
      updateProgressStepNumber();
    }  
    
    /**
    * on adjust height
    */
    function onOwlAdjustHeight(){
      adjustOwlStageHeight(true);
    }
    
    /**
    * init multistep
    */
    this.init = function(multiStepFormId){
      
      //init vars
      
      //classes
      g_classConnected = "uc-connected";
      g_classActive = "uc-active";
      g_stepIndicatorClassActive = "uc-item-active";
      g_firstStepClass = "ue_first_step";
      g_errorClass = "ue-form-error";
      g_conditionsClass = "ucform-has-conditions";
      g_doneClass = "uc-item-done";
      g_visibleClass = "ue-visible";
      g_invisibleClass = "ue-invisible";
      g_ueLoadingClass = "ue-loading";
      g_emptyFieldClass = "ue-empty-required-field";
      
      //selectors
      g_templateSelector = ".ue-multi-step-form-template-holder .elementor";
      g_multiStepItemSelector = ".ue-multi-step-form-item";
      g_fieldSelector = "input.ue-input-field, select.ue-input-field, textarea.ue-input-field, button.ue-input-field"; //should be equal to selector in Submit Button widget
      g_elementorWidgetParentSelector = ".elementor-widget";
      g_errorSelector = "."+g_errorClass;
      g_doneIconSelector = ".ue-done-icon";
      g_stepIconSelector = ".ue-step-icon";
      g_stepIconItemSelector = ".ue-step-icon-item";
      g_loaderSelector = ".ue-submit-button-loader";
      g_progressBarSelector = ".ue-multi-step-form-indicator-progress-bar";
      g_progressBarInnerSelector = ".ue-multi-step-form-indicator-progress-bar-inner";
      g_multiStepProgressBarNumbersSelector = ".ue-multi-step-form-indicator-progress-bar-numbers";
      
      //objects
      g_objMultiStepWidget = jQuery(multiStepFormId);
      g_objMultiStepItems = g_objMultiStepWidget.find(".ue-multi-step-form-item");
      g_objNextBtn = g_objMultiStepWidget.find(".ue-multi-step-form-button-next");
      g_objPrevBtn = g_objMultiStepWidget.find(".ue-multi-step-form-button-prev");
      g_objSubmitBtn = g_objMultiStepWidget.find(".ue-multi-step-form-button-submit");
      g_objOwlCarousel = g_objMultiStepWidget.find(".owl-carousel");
      g_objOwlCarouselItems = g_objMultiStepWidget.find(".owl-item");
      g_allBtnWrapper = g_objMultiStepWidget.find(".ue-multi-step-form-buttons");
      g_objStepIndicators = g_objMultiStepWidget.find(".ue-multi-step-form-indicator-item");
      g_objIconsContainer = g_objMultiStepWidget.find(".ue-multi-step-form-icons");
      g_objLoader = g_objMultiStepWidget.find(g_loaderSelector);
      g_objProgressBar = g_objMultiStepWidget.find(g_progressBarSelector);
      g_objProgressBarInner = g_objMultiStepWidget.find(g_progressBarInnerSelector);
      g_objMultiStepProgressBarNumbers = g_objMultiStepWidget.find(g_multiStepProgressBarNumbersSelector);
      
      g_objSubmitButtonWidget = jQuery(".ue-submit-button");
      
      //attr
      g_isInEditor = g_objMultiStepWidget.data("editor");
      
      //helpers
      g_activeStepIndex = 0;
      g_stepsNum = g_objMultiStepItems.length;
      
      //local vars
      var objFirstStep = g_objMultiStepItems.eq(0);
      
      //do not run in editor
      if(g_isInEditor == "no")
        handleItemTypeSection(); 
      
      //in editor run a different function that do not manipulate DOM (without detach)
      if(g_isInEditor == "yes")
        handleItemTypeSectionInEditor();
      
      //set first step as active    
      setActiveStep(objFirstStep);
      
      //see if Submit Button Widget is added on the page
      validateSubmitButton();
      
      //init submit button class
      initSubmitButton();
      
      //update progress
      updateProgressBar();
      
      //init events
      g_objNextBtn.on("click", onNextStepClick);
      g_objPrevBtn.on("click", onPrevStepClick);
      g_objSubmitBtn.on("click", onSubmitBtnClick);
      
      g_objOwlCarousel.on("changed.owl.carousel", onCarouselChange);
      g_objOwlCarousel.on("next.owl.carousel", onNextOwlCarouselEvent);    
      
      g_objMultiStepWidget.on("uc_adjust_owl_height", onOwlAdjustHeight);
      
      //cerate observer
      const targetNode = g_objMultiStepWidget[0]; // You can change this to any other element you want to observe.
      
      // Configuration of the observer
      const config = { attributes: true, childList: true, subtree: true, characterData: true };
      
      // Create a new instance of the Mutation Observer
      const observer = new MutationObserver(function(mutationsList, observer) {
        mutationsList.forEach(function(item, index){
          var target = item.target;
          var targetClass = target.getAttribute("class");
          var targetElementType = target.getAttribute("data-element_type");
          
          if(targetClass.indexOf("elementor-element") > -1 && targetElementType == "widget"){
            var objWidgetContainer = jQuery(target).find(".elementor-widget-container");
            var objFormField = objWidgetContainer.find("> div");
            var isHidden = objFormField.hasClass("ucform-has-conditions");
            
            if(isHidden == true)
              adjustOwlStageHeight(false);
            else
            adjustOwlStageHeight(true);
          }
          
        });
      });
      
      // Start observing the target node with the specified configuration
      observer.observe(targetNode, config); 
    }  
  }