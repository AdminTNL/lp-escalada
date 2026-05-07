function ueNumberField(){
  
  //objects
  var g_objWidget, g_objInput, g_objPlusButton, g_objMinusButton;
  
  //attrs
  var g_dataCalcMode, g_dataShowIncButtons, g_dataStep, g_maxValue, g_minValue, g_dataEditor, g_dataDebug;
  
  //helpers
  var g_inputNumber, g_numbersAfterComa, g_dataLimitDigits, g_dataDigitsNum;
  
  //classes
  var g_classDisabled;
  
  //conditions 
  var g_arrVisibility;
  
  /**
  * get parent input calc
  */
  function getParentCalcInput(objInput){
    
    var parentAttrArray = objInput.attr("data-parent-formula-input");
    
    if(!parentAttrArray)
      return(null); 
    
    parentAttrArray = parentAttrArray.split(",");
    
    var parentsArray = [];
    
    parentAttrArray.forEach(function(parent, index){
      
      var objParentCalkInput = jQuery("#"+parent).find("[data-calc-mode='true']");
      
      parentsArray.push(objParentCalkInput);
      
    });
    
    return(parentsArray);
    
  }
  
  /*
  * show custom error
  */
  function showCustomError(type){
    var errorText = g_objInput.data(type+"-error");
    var objError = g_objWidget.find('.ue-number-error');
    
    objError.text(errorText);
    
    objError.parent().show();
    objError.show();
  }
  
  /**
  * check if value is in min max range
  */
  function validateValue(val){
    
    if(val > g_maxValue)
      showCustomError("max");    
    else if(val < g_minValue)
      showCustomError("min");
    else
    
    var objError = g_objWidget.find('.ue-number-error');
    
    objError.parent().hide();
    objError.hide();    
  }
  
  /**
  * input change controll
  */
  function onInputChange(){
    
    //if calc mode false, find parent input with calc mode and trigger event
    var objParentCalkInputs = getParentCalcInput(g_objInput);
    
    if(objParentCalkInputs && objParentCalkInputs.length > 0){
      
      objParentCalkInputs.forEach(function(objParent, index){
        
        objParent.trigger('input_calc');
        
      });
      
    }
    
    //update g_inputNumber var
    g_inputNumber = parseFloat(g_objInput.val());
    
    //check if value is in min max range
    validateValue(g_inputNumber);
    
    if(g_dataCalcMode == true)
      return(true);
    
    if(g_dataShowIncButtons == true){      
      //check if value greater then max val    
      if(g_maxValue !== '' && g_inputNumber >= g_maxValue)            
        disableButton(g_objPlusButton);
      else
      enableButton(g_objPlusButton);
      
      //check if value less then min val  
      if(g_minValue !== '' && g_inputNumber <= g_minValue)      
        disableButton(g_objMinusButton); 
      else   
      enableButton(g_objMinusButton);      
    }    
    
    var inputVal = g_objInput.val();
    var inputValLength = inputVal.length;
    
    if(g_dataLimitDigits == true && inputValLength > g_dataDigitsNum){          	
      inputVal = inputVal.slice(0, -1);
      
      g_objInput.val(inputVal);
    }    
  }

  /**
   * on inpt blur
   */
  function onBlur(){
    var inputVal = g_objInput.val();
    var inputValLength = inputVal.length;
    
    if(g_dataLimitDigits == true && inputValLength < g_dataDigitsNum){          	
      showCustomError("digits");
    } 
  }
  
  /**
  * check if firmula has spaces and remove them
  */
  function checkSpacesAndRemove(){
    
    if(g_dataDebug == false)
      return(false);
    
    var dataFormula = g_objInput.data('formula');
    
    //if space just erase it
    dataFormula = dataFormula.replace(/\s+/g, "");
    
    var objFormula = g_objWidget.find('.ue-number-formula');
    
    if(!objFormula.length)
      return(false);
    
    objFormula.text(dataFormula);
    
  } 
  
  /**
  * add readonly attr
  */
  function addReadonlyAttr(){
    
    var dataReadonly = g_objInput.data("readonly");
    
    if(dataReadonly == false)
      return(false);
    
    g_objInput.attr('readonly', '');
    
  }
  
  /**
  * disable button
  */
  function disableButton(objButton){
    
    objButton.addClass(g_classDisabled);
    objButton.prop('disabled', true);
    
  }
  
  /**
  * enable button
  */
  function enableButton(objButton){
    
    objButton.removeClass(g_classDisabled);
    objButton.prop('disabled', false);
    
  }
  
  /**
  * click on plus button
  */
  function onPlusButtonClick(){
    
    g_inputNumber = (parseFloat(g_inputNumber) + parseFloat(g_dataStep)).toFixed(g_numbersAfterComa);
    
    //enable minus btn
    enableButton(g_objMinusButton);
    
    //check if value greater then max val    
    if(g_maxValue !== '' && g_inputNumber >= g_maxValue){
      
      g_inputNumber = g_maxValue;
      
      disableButton(g_objPlusButton);
      
    }
    
    g_objInput.val(g_inputNumber);
    
    onInputChange();
    
  }
  
  /**
  * count number of characters after coma
  */
  function countDecimalPlaces(number) {
    
    // Convert the number to a string
    var numStr = number.toString();
    
    // Check if there is a decimal point in the string
    if (numStr.indexOf('.') !== -1) {
      
      // Calculate the number of characters after the decimal point
      return numStr.split('.')[1].length;
      
    } else {
      
      // If there is no decimal point, there are no decimal places
      return 0;
      
    }
    
  }
  
  /**
  * click on minus button
  */
  function onMinusButtonClick(){
    
    g_inputNumber =  (parseFloat(g_inputNumber) - parseFloat(g_dataStep)).toFixed(g_numbersAfterComa);
    
    //enable plus btn
    enableButton(g_objPlusButton);
    
    //check if value less then min val  
    if(g_minValue !== '' && g_inputNumber <= g_minValue){
      
      g_inputNumber = g_minValue;
      
      disableButton(g_objMinusButton);
      
    }
    
    g_objInput.val(g_inputNumber);
    
    onInputChange();
    
  }
  
  //init from js tab
  this.init = function(widgetId){
    
    //init vars
    g_objWidget = jQuery(widgetId);
    g_objInput = g_objWidget.find('.ue-input-field');
    g_objError = g_objWidget.find('.ue-number-error');
    
    //attrs
    g_dataCalcMode = g_objInput.data("calc-mode");
    g_dataShowIncButtons = g_objInput.data("show-inc-buttons");
    g_maxValue = parseFloat(g_objInput.attr('max'));
    g_minValue = parseFloat(g_objInput.attr('min'));
    g_dataEditor = g_objInput.data('editor');
    g_dataDebug = g_objInput.data('debug');
    g_dataLimitDigits = g_objInput.data("limit-digits");
    g_dataDigitsNum = g_objInput.data("digits-num");
    
    g_dataStep = g_objInput.attr("step");
    g_numbersAfterComa = countDecimalPlaces(g_dataStep);
    
    if(g_dataStep == '')
      g_dataStep = 1;
    
    //helpers
    g_inputNumber = g_objInput.val();
    
    //classes
    g_classDisabled = 'uc-disabled';    
    
    //remove spaces from formula
    checkSpacesAndRemove();
    
    //add readonly attr if needed
    addReadonlyAttr();
    
    //init events
    // var objAllInputFields = jQuery(".ue-input-field");
    
    g_objInput.on('input', onInputChange);
    g_objInput.on('blur', onBlur);
    
    //find option elements and trigger calc
    // var objAllOptionFields = jQuery(".ue-option-field");
    
    // objAllOptionFields.on('change', onInputChange);
    
    //on plus button click
    //on minus button click
    if(g_dataShowIncButtons == true){
      
      g_objPlusButton = g_objWidget.find('.ue-plus-button');
      g_objMinusButton = g_objWidget.find('.ue-minus-button');
      
      g_objPlusButton.on("click", onPlusButtonClick);
      g_objMinusButton.on("click", onMinusButtonClick);
      
    }
    
  }
  
}