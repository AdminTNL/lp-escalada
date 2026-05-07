function ueSubmitButton(){
	
	t = this;
	
	//objects
	var g_objWidget, g_objButton, g_objLoader, g_objMultistepForm, g_objMultistepFormContainer, g_objMultistepFormSubmitButton;
	
	//selectors
	var g_fieldSelector, g_errorSelector, g_elementorWidgetParentSelector, g_multistepFormSelector, g_loaderSelector;
	
	//classes
	var g_loadingClass, g_resultClass, g_resultSuccessClass, g_resultErrorClass, g_debugClass, g_submitButtonClass, g_submitButtonElementClass, g_conditionsClass, g_errorClass, g_multistepModeClass, g_elementorWidgetParentClass;
	
	//helpers
	var g_dataEditor, g_isMultiStepFormWidgetMode;
	
	/**
	* get element widget id from parent wrapper
	*/
	function getElementWidgetID(objElement){
		if(!objElement || objElement.length == 0)
			throw new Error("Element not found");
		
		//get widget id
		var objWidget = objElement.parents(g_elementorWidgetParentSelector);
		
		if(objWidget.langth == 0)
			throw new Error("Elementor parent widget not found");
		
		var widgetID = objWidget.data("id");
		
		if(!widgetID)
			throw new Error("widget id not found");
		
		return(widgetID);
	}
	
	/**
	* is element in viewport
	*/
	function isElementInViewport(objElement) {
		
		var elementTop = objElement.offset().top;
		var elementBottom = elementTop + objElement.outerHeight();
		
		var viewportTop = jQuery(window).scrollTop();
		var viewportBottom = viewportTop + jQuery(window).height();
		
		return (elementBottom > viewportTop && elementTop < viewportBottom);
	}
	
	/**
	* check fro empty required fields
	*/
	this.isFieldRequiredAndEmpty = function(objField){
		
		var requiredAttribute = objField.attr("required");
		
		//check if required attr exist in the field
		if(!requiredAttribute)
			return(false);
		
		var fieldValue = objField.val();
		
		//see if value is empty or equal false
		if(fieldValue == "" || fieldValue == false && fieldValue != 0 || fieldValue == "false"){
			return(true);		
		}
	}
	
	/**
	* get Error object
	*/
	function getErrorObjectMultistep(objField, elementorWidgetParentSelector, errorClass){
		
		var objWidgetContainer = objField.closest(g_elementorWidgetParentSelector);
		
		if(!g_elementorWidgetParentSelector)
			objWidgetContainer = objField.closest(elementorWidgetParentSelector);
		
		var objError = objWidgetContainer.find(g_errorSelector);
		
		if(!g_errorSelector)
			objError = objWidgetContainer.find("."+errorClass);
		
		return(objError);
	}
	
	/**
	* get Error object
	*/
	function getErrorObjectRegularForm(objField){		
		var fieldName = objField.attr("name");
		
		var objSubmitButtonParent = g_objWidget.parent();
		
		var objError = objSubmitButtonParent.find("."+g_errorClass+"[data-field-name='"+fieldName+"']");
		
		return(objError);
	}
	
	/**
	* show field error
	*/
	function showFieldError(objField, errorHtml){
		objField.css({
			"background-color": "#ffe5e9"
		});
		
		g_elementorWidgetParentClass = "elementor-widget";
		
		var objWidgetContainer = objField.closest("."+g_elementorWidgetParentClass);		
		var objError = getErrorObjectMultistep(objField, g_elementorWidgetParentSelector, g_errorClass);
		var objWidget = objWidgetContainer.find(">div");
		
		g_objMultistepForm = jQuery(".ue-multi-step-form");
		g_isMultiStepFormWidgetMode = isMultiStepFormWidgetAdded();
		
		//for multistep form prepend erros before fields
		if(g_isMultiStepFormWidgetMode == true){			
			
			if(!objError || objError.length == 0)
				objWidget.prepend(errorHtml);	
		}
		
		//for regular field append errors after submit button
		if(g_isMultiStepFormWidgetMode == false){
			
			var objButtonError = getErrorObjectRegularForm(objField);
			
			//append only errors that are not repeating (one error for one empty field)
			if(!objButtonError || objButtonError.length == 0)
				jQuery(errorHtml).insertAfter(g_objWidget);
		}
		
		if(isElementInViewport(objField) == false){
			
			var offsetTop = objField.offset().top;
			
			jQuery("html").animate({ scrollTop: (offsetTop - 100) }, 500);
			
		}
	}
	
	/**
	* show emty required field error and scroll to field
	*/
	this.showNotValidEmailFieldError = function(objField){
		var textError = "Email Field is not valid.";
		var fieldName = objField.attr("name");
		g_errorClass = "ue-form-error";
		
		var errorHtml = "<div class='"+g_errorClass+" ue-empty-required-field' data-field-name='"+fieldName+"'>"+textError+"</div>";
		
		showFieldError(objField, errorHtml);		
	}
	
	/**
	* show emty required field error and scroll to field
	*/
	this.showNotValidPhoneFieldError = function(objField){
		var textError = "Phone Field is not valid.";
		var fieldName = objField.attr("name");
		g_errorClass = "ue-form-error";
		
		var errorHtml = "<div class='"+g_errorClass+" ue-empty-required-field' data-field-name='"+fieldName+"'>"+textError+"</div>";
		
		showFieldError(objField, errorHtml);		
	}
	
	
	/**
	* show emty required field error and scroll to field
	*/
	this.showEmptyRequiredFieldError = function(objField){
		var textError = g_objWidget.data("empty-field-error");
		var dataShowName = g_objWidget.data("show-name");
		var fieldName = objField.attr("name");
		
		if(dataShowName == true)
			textError = textError+" '"+fieldName+"'";
		
		g_errorClass = "ue-form-error";		
		var errorHtml = "<div class='"+g_errorClass+" ue-empty-required-field' data-field-name='"+fieldName+"'>"+textError+"</div>";
		
		showFieldError(objField, errorHtml);
	}
	
	/**
	* remove errors
	*/
	this.removeErrors = function(fieldSelector, elementorWidgetParentSelector, errorClass){
		var objFields = jQuery(fieldSelector);
		
		objFields.each(function(){
			var objField = jQuery(this);
			
			objField.css({
				"background-color": ""
			});
			
			g_objMultistepForm = jQuery(".ue-multi-step-form");
			g_isMultiStepFormWidgetMode = isMultiStepFormWidgetAdded();
			
			if (g_isMultiStepFormWidgetMode == true){
				var objError = getErrorObjectMultistep(objField, elementorWidgetParentSelector, errorClass);
				
				if(objError && objError.length > 0)
					objError.remove();
			}
			
			if (g_isMultiStepFormWidgetMode == false){
				var objSubmitButtonError = getErrorObjectRegularForm(objField);
				
				if(objSubmitButtonError && objSubmitButtonError.length > 0)
					objSubmitButtonError.remove();
			}
		});
	}
	
	/** 
	* is email valid
	*/
	this.isEmailFieldValid = function(objField){
		var fieldType = objField.attr("type");
		
		if(fieldType != "email")
			return(true);
		
		if(fieldType == "email" && objField.hasClass("ue-form-email-input-error") == true)
			return(false);
	}
	
	/** 
	* is email valid
	*/
	this.isPhoneFieldValid = function(objField){
		var fieldType = objField.attr("type");
		
		if(fieldType != "tel")
			return(true);
		
		if(fieldType == "tel" && objField.hasClass("ue-form-phone-input-error") == true)
			return(false);
	}
	
	/** 
	* is file field valid
	*/
	this.isFileFieldValid = function(objField){
		var fieldType = objField.attr("type");
		
		if(fieldType != "file")
			return(true);
		
		if(fieldType == "file" && objField.hasClass("ue-form-file-input-error") == true)
			return(false);
	}
	
	/**
	* is filed verified
	*/
	this.isVerified = function(objField, conditionsClass, throwError){
		//check if objFiled is hidden
		var isHidden = objField.hasClass(conditionsClass);
		
		//check if not in stiky container
		var objParents = objField.parents();

		objParents.each(function(){
			var objParent = jQuery(this);

			if(objParent.hasClass("elementor-sticky") == true){
				//when one parent has class elementor-sticky--active then exist another elementor-sticky element, but hidden. If it doesn't exist, then original 
				//elementor-sticky is visible
				var isParentVisible = objParent.hasClass("elementor-sticky--active");
				var isCurrentParentHidden = objParent.hasClass("elementor-sticky__spacer");			
				var isNextParentHidden = objParent.next().hasClass("elementor-sticky__spacer");				
			
				//to make sure that next sticky container exists and contains visible form fields
				if(isParentVisible == false && isNextParentHidden == true){
		
					isHidden = true;
				}else if(isCurrentParentHidden == true){
		
					isHidden = true;
				}

			}
		});

		if(isHidden == true)
			return(null);		
		
		//check if objFiled has hidden parents
		var objHiddenParents = objField.parents("."+conditionsClass);
		
		if(objHiddenParents && objHiddenParents.length)
			return(null);
		
		//check if required fields are not empty
		var isRequiredAndEmpty = t.isFieldRequiredAndEmpty(objField);
		var isEmailVerified = t.isEmailFieldValid(objField);
		var isPhoneVerified = t.isPhoneFieldValid(objField);
		
		if(isRequiredAndEmpty == true || isEmailVerified == false || isPhoneVerified == false){
			
			g_objMultistepForm = jQuery(".ue-multi-step-form");
			
			if(g_objMultistepForm && g_objMultistepForm.length > 0)
				g_objMultistepForm.trigger("uc_adjust_owl_height");			
			
			if(isRequiredAndEmpty == true ){
				
				//if field is Text Field then force throw error
				var fieldType = objField.attr("type");
				
				if(fieldType == "text")
					throwError = true
				
				t.showEmptyRequiredFieldError(objField);
			}
			
			if(isEmailVerified == false )
				t.showNotValidEmailFieldError(objField);
			
			if(isPhoneVerified == false )
				t.showNotValidPhoneFieldError(objField);
			
			if(throwError == true){
				throw new Error("Form Fields Error: check if fields are not empty and verified.");
			} else
			return(false);
			
		}else				
		return(true); //if all verifications are passed return true		
	}
	
	/**
	* get all field values on the page
	*/
	function getValues(){
		var objFields = jQuery(g_fieldSelector);
		var arrValues = [];
		
		//show error if no field found on the page
		if(!objFields.length){
			var textError = "Couldn't find any UE Field widget on the page.";
			
			g_objWidget.prepend("<div class="+g_errorSelector+">"+textError+"</div>")
			
			throw new Error(textError);
		}
		
		//remove previous errors
		t.removeErrors(g_fieldSelector, g_elementorWidgetParentSelector, g_errorClass);
		
		var isFormVerified = true;
		
		objFields.each(function(){
			var objField = jQuery(this);
			
			//skip field if not verified
			if(t.isVerified(objField, g_conditionsClass, false) == false){
				isFormVerified = false;
				return;
			}
			
			//if is verivied == null it means that field is hidden
			if(t.isVerified(objField, g_conditionsClass, false) == null)
				return;
			
			var fieldId = getElementWidgetID(objField);
			var fieldType = "text";
			var fieldValue = objField.val();
			
			if(objField.is("input")){
				var type = objField.attr("type");
				
				switch(type){
					case "checkbox":
					case "radio":
					case "number":
					fieldType = type;
					break;
					case "file":
					fieldType = "files";
					fieldValue = objField.prop("files");
					break;
				}
			}else if(objField.is("textarea")){
				fieldType = "textarea";
			}else if(objField.is("select")){
				fieldType = objField.prop("multiple") ? "multiselect" : "select";
			}
			
			var objValue = {
				id: fieldId,
				type: fieldType,
				value: fieldValue
			};
			
			arrValues.push(objValue);
		});
		
		if(isFormVerified == false)
			throw new Error("UE form is not verified. Please, check if any required field is empty.")
		
		return(arrValues);
	}
	
	/**
	* get form id
	*/
	function getFormId(){
		var objParent = g_objWidget.closest(g_elementorWidgetParentSelector);
		var formId = objParent.data("id");
		
		return formId.toString();
	}
	
	/**
	* get layout id
	*/
	function getLayoutId(){
		var objLayout = g_objWidget.closest(".elementor");
		var layoutId = objLayout.data("elementor-id");
		
		return layoutId;
	}
	
	/**
	* on success ajax
	*/
	function onAjaxSuccess(data){
		
		if(data.success == true){
			g_objButton.addClass(g_resultSuccessClass);
			g_objMultistepFormSubmitButton.addClass(g_resultSuccessClass);
		}
		
		g_objWidget.find("." + g_resultClass).remove();
		g_objWidget.find("." + g_debugClass).remove();
		
		var resultElement = jQuery('<div />')
		.addClass(g_resultClass)
		.addClass(data.success === true ? g_resultSuccessClass : g_resultErrorClass)
		.html(data.message);
		
		g_objWidget.append(resultElement);
		
		if (data.debug) {
			var debugElement = jQuery('<div />')
			.addClass(g_debugClass)
			.html(data.debug);
			
			g_objWidget.append(debugElement);
		}
		
		if (data.redirect) {
			location.href = data.redirect;
		}
		
		//hide for if needed
		if(data.success === true)
			hideFormAfterSubmit();
		else
		removeLoaderInMultiStepSubmitButton();
	}
	
	/**
	* console.log some string
	*/
	function trace(str){
		console.log(str);
	}
	
	/**
	* show error
	*/
	function showError(){
		var resultElement = jQuery('<div />')
		.addClass(g_resultClass)
		.addClass(g_resultErrorClass)
		.html("ajax error");
		
		g_objWidget.append(resultElement);		
	}
	
	/**
	* show debug
	*/
	function showDebug(html){
		var debugElement = jQuery('<div />')
		.addClass(g_debugClass)
		.html(html);
		
		g_objWidget.append(debugElement);
	}
	
	/**
	* small ajax request
	*/
	function ajaxRequest(postId, formId, templateId, formValues){
		g_objButton.prop("disabled", true);
		g_objLoader.addClass(g_loadingClass);
		
		g_objWidget.find("." + g_resultClass).remove();
		g_objWidget.find("." + g_debugClass).remove();
		
		var data = new FormData();
		
		data.append("ucfrontajaxaction", "submitform");
		data.append("postId", postId);
		data.append("formId", formId);
		data.append("templateId", templateId);
		
		formValues.forEach(function(formValue, index){
			var id = formValue.id;
			var type = formValue.type;
			var value = formValue.value;
			
			data.append("formData[" + index + "][id]", id);
			data.append("formData[" + index + "][type]", type);
			
			if (type === "files")
				for(var i = 0, n = value.length; i < n; i++){
				data.append("formFiles[" + id + "][]", value[i]);
			}
			else
			data.append("formData[" + index + "][value]", value);
		});
		
		var ajaxOptions = {
			method: "POST",
			url: location.href,
			data: data,
			dataType: "json",
			contentType: false,
			processData: false,
			success: function(response){
				onAjaxSuccess(response);
			},
			complete: function () {
				g_objButton.prop("disabled", false);
				g_objLoader.removeClass(g_loadingClass);
			},
			error: function(jqXHR, textStatus, errorThrown){
				
				var html = jqXHR.responseText;
				
				//show error
				showError();
				
				//show debug
				showDebug(html);				
			}
		}
		
		var handle = jQuery.ajax(ajaxOptions);
		
		return(handle);
	}
	
	/**
	* click on submit button
	*/
	function onSubmitButtonClick(){
		var values = getValues();
		var postId = getLayoutId();
		var formId = getFormId();
		var templateId = null;
		
		if (g_isMultiStepFormWidgetMode === true)
			templateId = getMultistepTemplateId();
		
		ajaxRequest(postId, formId, templateId, values);
	}
	
	
	/*
	** show error for other submit buttons on the page
	*/
	function showMultipleSubmitButtonsError(objButton){
		
		var textError = "Found more then one Submit Button widget on the page. Please use only one Submit Button per page.";
		
		objButton.html("<div class="+g_errorSelector+">"+textError+"</div>")
		
		throw new Error(textError);
		
	}
	
	/**
	* chek if submit button is unique on the page
	*/
	function findOtherSubmitButtons(){
		
		var objSubmitButtons = jQuery("."+g_submitButtonClass);
		
		//if button is unique then exit function
		if(objSubmitButtons.length === 1)
			return(false);
		
		//if button is not unique then make sure it's same widget
		objSubmitButtons.each(function(index, elem){
			
			var objButton = jQuery(this);
			var objButtonChild = objButton.find("."+g_submitButtonElementClass);
			
			//if no such child skip the element
			if(!objButtonChild || !objButtonChild.length)
				return(true);
			
			var buttonType = objButtonChild.attr("type");
			
			//if type id different skip element as well
			if(buttonType != "submit")
				return(true);
			
			//skip first button to display it
			if(index == 0)
				return(true);
			
			showMultipleSubmitButtonsError(objButton);
			
		});
		
	}
	
	/**
	* see if any multi step form widget is added to the page
	*/
	function isMultiStepFormWidgetAdded(){
		if(!g_objMultistepForm || g_objMultistepForm.length === 0)
			return false;
		
		return true;
	}
	
	/**
	* get multi step widget id attribute
	*/
	function getMultistepFormId(){
		return g_objMultistepForm.attr("id");
	}
	
	/**
	* get multi step widget id attribute
	*/
	function getMultistepTemplateId(){
		return g_objMultistepForm.data("template-id");
	}
	
	/**
	* show multi step form message in editor
	*/
	function showMultistepFormMessage(){
		
		if(g_dataEditor == "no")
			return(false);
		
		var multistemFormId = getMultistepFormId();
		var messageHtml = '<div class="ue-message">The submit button is connected to the Multistep From Widget with id: '+multistemFormId+'. To edit the submit actions click here. </div>'; 
		
		g_objWidget.prepend(messageHtml);
		
	}
	
	/**
	* add multistep form class to Button on frontend
	*/
	function hideSubmitButton(){
		
		g_objWidget.addClass(g_multistepModeClass);
		
	}
	
	/**
	* show message in editor and hide Submit button if Multi Step form is found
	*/
	function initMultiStepFormMode(){
		
		if(g_isMultiStepFormWidgetMode == false)
			return(false);
		
		//show message in editor
		showMultistepFormMessage();
		
		//hide button
		hideSubmitButton();
		
	}	
	
	
	/**
	* hide carousel after submit
	*/
	function hideCarouselAfterSubmit(){
		
		if(!g_objMultistepFormContainer)
			return(false);
		
		g_objMultistepFormContainer.slideUp("fast");
		
	}
	
	/**
	* hide all the form fields after submit
	*/
	function hideFieldsAfterSubmit(){
		
		var objFields = jQuery(g_fieldSelector);
		
		objFields.each(function(){
			var objField = jQuery(this);
			var objFieldWidgetParent = objField.parents(".elementor-widget-container");
			
			objFieldWidgetParent.slideUp("fast");
			
		});
		
	}
	
	/**
	* hide form after submit
	*/
	function hideFormAfterSubmit(){
		
		var dataHideForm = g_objButton.data("hide-form");
		
		if(dataHideForm == false)
			return(false);
		
		//hide multi step carousel 
		//hide fields
		if(g_isMultiStepFormWidgetMode == true)
			hideCarouselAfterSubmit();
		else
		hideFieldsAfterSubmit();
		
	}
	
	/**
	* handle error form send in multi step mode
	*/
	function removeLoaderInMultiStepSubmitButton(){
		
		if(g_isMultiStepFormWidgetMode == false)
			return(false);
		
		var objLoader = g_objMultistepForm.find(g_loaderSelector);
		
		objLoader.removeClass(g_loadingClass);
		
	}
	
	
	this.init = function(widgetId){
		//init vars
		
		//classes
		g_loadingClass = "ue-loading";
		g_resultClass = "ue-submit-button-result";
		g_resultSuccessClass = "ue-success";
		g_resultErrorClass = "ue-error";
		g_debugClass = "ue-submit-button-debug";
		g_conditionsClass = "ucform-has-conditions";
		g_errorClass = "ue-form-error";
		g_multistepModeClass = "ue-multistep-mode";
		g_elementorWidgetParentClass = "elementor-widget";
		
		//selectors
		g_fieldSelector = "input.ue-input-field, select.ue-input-field, textarea.ue-input-field, button.ue-input-field, .ue-input-field";
		g_errorSelector = "."+g_errorClass;
		g_elementorWidgetParentSelector = "."+g_elementorWidgetParentClass;
		g_multistepFormSelector = ".ue-multi-step-form";
		g_loaderSelector = ".ue-submit-button-loader";
		
		g_objWidget = jQuery("#"+widgetId);
		g_objButton = g_objWidget.find(".ue-submit-button-element");
		g_objLoader = g_objWidget.find(g_loaderSelector);
		g_objMultistepForm = jQuery(g_multistepFormSelector);
		g_objMultistepFormSubmitButton = g_objMultistepForm.find(".ue-multi-step-form-button-submit");
		g_objMultistepFormContainer = g_objMultistepForm.find(".ue-multi-step-form-container");
		
		//helpers
		g_dataEditor = g_objWidget.data("editor");
		g_isMultiStepFormWidgetMode = isMultiStepFormWidgetAdded();
		
		//check for multiple submit buttons
		findOtherSubmitButtons();
		
		//check for multistep form mode
		initMultiStepFormMode();
		
		//init events
		g_objButton.on("click", onSubmitButtonClick);
	}
}
