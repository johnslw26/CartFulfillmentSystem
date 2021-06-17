var fulfillmentItemsJSON;
var step = 1;
var maxSteps= 1;
var searchCategories = new Set();
var activeSearchCategories = new Set();
var fulfillmentItems;

$(function(){
	
	//add function to populate all variable content
	
	$.ajax({
		type: "POST",
		url: "https://mmcapimanagement.azure-api.net/dmp/GetFulfillmentItems",

		// Request headers
		beforeSend: function(xhrObj) {
			xhrObj.setRequestHeader("Content-Type", "application/json");
			xhrObj.setRequestHeader("Cache-Control", "no-cache");
			xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", subscriptionKey);
			},
		// Request body
		data: JSON.stringify({
			"clientId": clientID,
			"catalogcode" : catalogCode
			}),
		})
		.done(function (data) {
			fulfillmentItems = data;
			if(fulfillmentItems){
				populateFulfillmentContainer(fulfillmentItems);
				
			}
		})
		.fail(function (j) {
			
		console.log(j);
		});
		
	maxSteps = $(".step-container").length;
	replaceDynamicBodyContent();
});

function replaceDynamicBodyContent(){
	$(".products-per-page").html(productsPerPageText);
	$(".carItemText").html(cartText);
	$(".cart-header .subheader").html(cartHeaderText);
	$(".cart-description-content").html(cartDescriptionText);
	$(".checkout-button").html(cartButtonText);
}

function getFormattedDate(date) {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
  
    return month + '/' + day + '/' + year;
}

function getFormFieldValue(formField){
	var field = $("#"+formField);
	var fieldValue = field.val() == "" ? null : field.val();
	return fieldValue;
}

//We are canceling default form submit, and debouncing to prevent overflow. All so we can submit to the api then to the form's action page.
var isFormAbleToSubmit = false;
function submitFormToAPI(ev){
	currentDate = getFormattedDate(new Date());
	if(!isFormAbleToSubmit){
		$.ajax({
			type: "POST",
			url: "https://mmcapimanagement.azure-api.net/dmp/PostFulfillmentRequestOrder",

			// Request headers
			beforeSend: function(xhrObj) {
				xhrObj.setRequestHeader("Content-Type", "application/json");
				xhrObj.setRequestHeader("Cache-Control", "no-cache");
				xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", subscriptionKey);
				},
			// Request body
			data: JSON.stringify({
			"clientId": clientID,
			"sourceClientIdentifier": sourceClientIdentifier,
			"shippingCarrierIdentifier": shippingCarrierIdentifier,
			"shippingMethodIdentifier": shippingMethodIdentifier,
			"sourceTargetIdentifier": "RealTime:"+$("#rpiVisitorID").attr("value"),
			"sourceOrderIdentifier": sourceOrderIdentifier,
			"sourcePackageCode": sourcePackageCode,
			"orderDatetime": ""+currentDate,
			"orderPriority": 1,
			"chargeNumber": null,
			"poNumber": null,
			"shipToTitleOfRespect": null,
			"shipToFirstName": getFormFieldValue("contact_firstname"),
			"shipToMiddleName": null,
			"shipToLastName": getFormFieldValue("contact_lastname"),
			"shipToMaturitySuffix": null,
			"shipToProfessionalSuffix": null,
			"shipToBusinessName": getFormFieldValue("company_companyname"),
			"shipToAddress1": getFormFieldValue("contact_address1"),
			"shipToAddress2": null,
			"shipToAddress3": null,
			"shipToCity": getFormFieldValue("contact_city"),
			"shipToState": getFormFieldValue("contact_state"),
			"shipToPostalCode": getFormFieldValue("contact_zip"),
			"shipToCountry": "USA",
			"shipToEmailAddress": getFormFieldValue("contact_emailaddress1"),
			"shipToPhoneNumber": null,
			"shipToPhoneCountryCode": null,
			"orderPlacedByEmailAddress": getFormFieldValue("contact_emailaddress1"),
			"comment": null,
			"chxCatalogCode": catalogCode,
			"itemsXML": Cart.convertCartToXML()
		}),
    })
	.done(function (data) {
		isFormAbleToSubmit = true;
		localStorage.removeItem("cart-items");
		console.log("===================================================\nSubmit:",data);
	})
	.fail(function (j) {
		console.error(j);
	});
	}
}

//Draws the new order step container
function updateStep(newStep){
	$(".step-container[data-step="+step+"]").toggle();
	$(".step-container[data-step="+newStep+"]").toggle();
	step=newStep;
}

//Advances to the next order tep
function nextStep(){
	if(Cart.items.length > 0){
	var newstep = step + 1;
	if( newstep <= maxSteps){
		updateStep(newstep);
	}
	}else{
		alert(cartEmptyText);
	}
}

//Returns to the previous order step
function previousStep(){
	var newstep = step - 1;
	if( newstep <= maxSteps && newstep > 0){
		updateStep(newstep);
	}
	populateFulfillmentContainer(fulfillmentItemsJSON);
}

//Clears the pagination as well as the items in fulfillment-container
function clearFulfillmentContainer(){
	$(".fulfillment-container").html("");
	$(".pagination-buttons").html("");
}

//Displays the available pages based on how many items there are divided by the items to display on the page, also handles adjusting which button is active
function populatePagination(maxPages, selectedPage){
	var paginationButtons = $(".pagination-buttons");
	for(var page = 0; page <= maxPages; page++){
		if(page == selectedPage-1){
			paginationButtons.append("<li class='active-page' onclick='onPageChanged(this.innerHTML)'>"+(page+1)+"</li>");
		}else{
			paginationButtons.append("<li class='' onclick='onPageChanged(this.innerHTML,this)'>"+(page+1)+"</li>");
		}
	}
}

function populateSearchItems(searchCategories){
	if($('.search-options .check-option').length === 0){
		$('.search-options').html("");
		searchCategories.forEach(function(category){
			$('.search-options').append('<div class="check-option"><input onchange="onSearchOptionsChanged(this)" type="checkbox" value="'+category+'"'+(activeSearchCategories.has(category)? ' checked' :'')+'>'+category+'</div>');
		});
	}
	var index = 0;
	var separator = "";
	$('.search-bar').html("");
	activeSearchCategories.forEach(function(category){
		separator = index < activeSearchCategories.size-1 ? ', ' : '';
		$('.search-bar').append(category + separator);
		index += 1;
	});
}

function clearOutOfStockItems(fulfillmentJSON){
	var tempJSON = [];
	if(activeSearchCategories.size > 0){
		fulfillmentJSON.forEach(function(item,key){
			//Makes sure the search category is populated
			if(item.quantityOnHand <= 0 || !activeSearchCategories.has(item.itemCategory)) return;
			tempJSON.push(item);
		});
	}
	return tempJSON;
}

//Handles the populating of the fulfillment container, poplation of the pagination and which items to show on the selected page
function populateFulfillmentContainer(fulfillmentJSON, page=1){
	clearFulfillmentContainer();
	
	if(searchCategories.size === 0){
		fulfillmentJSON.forEach(function(item,key){
			if(item.quantityOnHand > 0){
				searchCategories.add(item.itemCategory);
				activeSearchCategories.add(item.itemCategory);
			}
		});
	}
	
	fulfillmentItemsJSON = clearOutOfStockItems(fulfillmentJSON);
	console.log(fulfillmentItemsJSON);
	var imgURL = ""
	var selectOptions = ""
	var itemsPerPage = parseInt($(".items-per-page").val());
	var fulfillmentItem, container, itemID, cartItemIndex;
	var itemQuantity = 0;

	for(var index = ((page-1)*itemsPerPage); index < fulfillmentItemsJSON.length; index++){
		fulfillmentItem = fulfillmentItemsJSON[index];
		if(index < itemsPerPage*page){
			imgURL = fulfillmentItem.imageName ? 'https://www.mmcwebthing.com/Cart/' + clientPath + '/' +  fulfillmentItem.imageName : defaultImage;
			
			selectOptions = "";
			cartItemIndex = Cart.indexOfItem(fulfillmentItem.sourceItemCode+"");
			if(cartItemIndex != null){
				itemQuantity = Cart.items[cartItemIndex].quantity;
				itemID = Cart.items[cartItemIndex].id;
			}
			
			//Verify the quantity on hand is larger than the minimum inventory, populate the dropdown with how much the customer can buy at once, makes sure the order cap doesn't go below the minimum inventory

			var preExistingItemQuantity = 0;
			if(fulfillmentItem.quantityOnHand > fulfillmentItem.minimumInventoryQuantity){
				for(var quantityAbleToBuy = 1; quantityAbleToBuy <= (fulfillmentItem.quantityOnHand - fulfillmentItem.minimumInventoryQuantity); quantityAbleToBuy++){
					if(quantityAbleToBuy <= fulfillmentItem.orderCap){
						if(quantityAbleToBuy == itemQuantity && fulfillmentItem.sourceItemCode === itemID){
							preExistingItemQuantity = quantityAbleToBuy;
							selectOptions = selectOptions + "<option value='"+quantityAbleToBuy+"' selected>"+quantityAbleToBuy+"</option>";
						}else{
							selectOptions = selectOptions + "<option value='"+quantityAbleToBuy+"'>"+quantityAbleToBuy+"</option>";
						}
					}
				} 
				container = $('.fulfillment-container');
				container.append(generateAdjustedTemplate(fulfillmentItem.itemName,fulfillmentItem.itemDescription,preExistingItemQuantity,imgURL, fulfillmentItem.sourceItemCode,(fulfillmentItem.quantityOnHand - fulfillmentItem.minimumInventoryQuantity),fulfillmentItem.orderCap, selectOptions));
				
			}
		}
	}	
	populateSearchItems(searchCategories);
	populatePagination(Math.floor(fulfillmentItemsJSON.length/itemsPerPage),page);
	if(!showProductImages) $('.image-section').hide();
}

//Used within populateFulfillmentContainer() to append a pre-determined template with values into the fulfillment-container
function generateAdjustedTemplate(title,description,quantity,img,sku,maxQuantity,orderCap,selectOptions){
	var itemQuantity = quantity;
	var itemTemplate = '<div class="fulfillment-item flex-container" data-item-title="'+title+'" data-item-description="'+description+'" data-item-imageSrc="'+img+'">'+
	'<div class="image-section">'+
		'<img src="'+img+'"/>'+
		'</div>'+
		'<div class="content-section">'+
			'<p class="catalog-item-title">'+title+'</p>'+
			'<a onclick="onProductDetailsClicked(this)" ontouchend="onProductDetailsClicked(this)" class="order-details">'+orderDetailsText+'</a><br>'+
			'<div class="item-button-container"><button '+
				"type='button' "+
				"class='cart-add'"+
				"data-id='"+sku+"'" +
				"data-label='"+title+"'"+
				"data-price='0'"+
				"data-image='"+img+"'"+
				"data-quantity='" + itemQuantity +"'"+
				"data-maxquantity='"+maxQuantity+"'"+
				"data-orderCap='"+orderCap+"'"+
			  ">"+
			  addToCartButtonText+
			"</button>"+
			"<select onchange='onSelectQuantityChanged(event)' class='quantity-select'><option value='0'>0</option>"+selectOptions+"</select></div>"+
		"</div>"+
	"</div>"
	return itemTemplate;
}

function toggleProductDetails(){
	$(".productDescriptionLightbox").toggle();
}

function showProductDetails(title, description, imageSrc){
	var lightbox = $(".productDescriptionLightbox");
	var titleElement = $(".productDescriptionLightbox .productTitle");
	var descriptionElement = $(".productDescriptionLightbox .productDescription");
	var img = $(".productDescriptionLightbox img");
	titleElement.text(title);
	descriptionElement.text(description);
	img.attr("src",imageSrc);
	toggleProductDetails();
}

function changePage(pageNumber){
	populateFulfillmentContainer(fulfillmentItems,pageNumber);
}

function showSearchOptions(){
	$('.search-dropdown').toggle();
}

function clearAllSearchOptions(){
	$('.search-option').prop( "checked", false );
}

function updateSearchCategory(elementChanged){
	console.log(elementChanged);
	if(activeSearchCategories.has(elementChanged.value)){
		activeSearchCategories.delete(elementChanged.value);
	}else{
		activeSearchCategories.add(elementChanged.value);
	}
	populateFulfillmentContainer(fulfillmentItems);
}

/* EVENTS */

function onSearchOptionsChanged(elementChanged){
	updateSearchCategory(elementChanged);
}

function onSearchBarClicked(ev){
	showSearchOptions();
}

//Fired when the order quantity dropdown changes
function onSelectQuantityChanged(ev){
	var selectElement = $(ev.target);
	var cartAddButton = selectElement.parent().find("button");
	console.log(cartAddButton.data("quantity"));
	cartAddButton.data("quantity",parseInt(selectElement.val()));
	cartAddButton.attr("data-quantity",parseInt(selectElement.val()));
}

function onProductDetailsClicked(ev){
	var elementCallingEvent = ev;
	var parentDiv = $(elementCallingEvent).closest("div[data-item-title][data-item-description][data-item-imageSrc]");
	var imageSrc = $(elementCallingEvent).closest("div");
	showProductDetails(parentDiv.attr("data-item-title"),parentDiv.attr("data-item-description"), parentDiv.attr("data-item-imageSrc"));
}

function onPageChanged(pageNumber,pageButtonClicked){
	changePage(parseInt(pageNumber));
	var prevPage = $(".active-page");
	pageButtonClicked.classList.add("active-page");
}

function onProductsPerPageChanged(productsPerPageElement){
	populateFulfillmentContainer(fulfillmentItems);
}