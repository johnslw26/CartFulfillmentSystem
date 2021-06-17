var Cart = {};

Cart.on = function(eventName, callback) {
  if (!Cart.callbacks[eventName]) Cart.callbacks[eventName] = [];
  Cart.callbacks[eventName].push(callback);
  return Cart;
};

Cart.trigger = function(eventName, args) {
  if (Cart.callbacks[eventName]) {
    for (var i = 0; i<Cart.callbacks[eventName].length; i++) {
      Cart.callbacks[eventName][i](args||{});
    }
  }
  return Cart;
};

Cart.save = function() {
  localStorage.setItem('cart-items', JSON.stringify(Cart.items));
  Cart.trigger('saved');
  return Cart;
};

Cart.empty =  function() {
  Cart.items = [];
  Cart.trigger('emptied');
  Cart.save();
  return Cart;
};

Cart.indexOfItem = function(id) {
  for (var i = 0; i<Cart.items.length; i++) {
    if (Cart.items[i].id===id) return i;
  }
  return null;
};

Cart.removeEmptyLines = function() {
  newItems = [];
  for (var i = 0; i<Cart.items.length; i++) {
    if (Cart.items[i].quantity>0) newItems.push(Cart.items[i]);
  }
  Cart.items = newItems;
  return Cart;
};

Cart.addItem = function(item) {
	var index = Cart.indexOfItem(item.id);
	if (!item.quantity && index != null) item.quantity = -1 * Cart.items[index].quantity;
	
	if (index===null) {
		if(item.quantity <= item.maxquantity){
			Cart.items.push(item);
		}else{
			alert(orderCapReachedText);
		}
	} else {
		//account for the items coming in that are not yet saved to cart and check if it's less than the maxquantity
		var cartItem = Cart.items[index];
		var adjustedOrderQuantity = cartItem.quantity + item.quantity;
		console.log(adjustedOrderQuantity,cartItem.orderCap);
		if(item.quantity < 0 || adjustedOrderQuantity <= cartItem.maxquantity && adjustedOrderQuantity <= cartItem.orderCap){
			Cart.items[index].quantity += item.quantity;
		}else{
			alert(orderCapReachedText);
		}
	}
	Cart.removeEmptyLines();
	if (item.quantity > 0) {
		Cart.trigger('added', {item: item});
	} else {
		Cart.trigger('removed', {item: item});
	}
	Cart.save();
	return Cart;
};

Cart.convertCartToXML = function(){
	var xmlCartItems = ""
	Cart.items.forEach(function(item,index){
		xmlCartItems = xmlCartItems + "<Item>"+
		"<ItemCode>"+item.id+"</ItemCode>"+
		"<ItemQty>"+item.quantity+"</ItemQty>"+
		"<isApproved>"+1+"</isApproved>"+
	"</Item>"
	});

	return "<Items>"+xmlCartItems+"</Items>";
}

Cart.itemsCount = function() {
  var accumulator = 0;
  for (var i = 0; i<Cart.items.length; i++) {
    accumulator += Cart.items[i].quantity;
  }
  return accumulator;
};

Cart.currency = '&pound;';

Cart.displayPrice = function(price) {
  if (price===0) return 'Free';
  var floatPrice = price/100;
  var decimals = floatPrice==parseInt(floatPrice, 10) ? 0 : 2;
  return Cart.currency + floatPrice.toFixed(decimals);
};

Cart.linePrice = function(index) {
  return Cart.items[index].price * Cart.items[index].quantity;
};

Cart.subTotal = function() {
  var accumulator = 0;
  for (var i = 0; i<Cart.items.length; i++) {
    accumulator += Cart.linePrice(i);
  }
  return accumulator;
};

Cart.init = function() {
  var items = localStorage.getItem('cart-items');
  if (items) {
    Cart.items = JSON.parse(items);
  } else {
    Cart.items = [];
  }
  Cart.callbacks = {};
  return Cart;
}

Cart.initJQuery = function() {

  Cart.init();

  Cart.templateCompiler = function(a,b){return function(c,d){return a.replace(/#{([^}]*)}/g,function(a,e){return Function("x","with(x)return "+e).call(c,d||b||{})})}};

  Cart.lineItemTemplate = "<tr>" +
	"<td><img src='#{this.image}' alt='#{this.label}' /></td>" + 
    "<td></td>" + 
    "<td><p class='cart-title-label'>#{this.label}</p><br><button type='button' class='cart-add remove-btn' data-id='#{this.id}' data-quantity='-#{this.quantity}'>Remove</button><button type='button' class='cart-add' data-id='#{this.id}' data-quantity='-1'>-</button><span class='cart-quantity-text'>#{this.quantity}</span><button type='button' class='cart-add' data-id='#{this.id}' data-quantity='1'>+</button></td>" + 

  "</tr>";

  $(document).on('click', '.cart-add', function(e) {
    e.preventDefault();
    var button = $(this);
	console.log(button.data('quantity'));
    var item = {
      id: button.data('id'),
      price: button.data('price'),
      quantity: button.data('quantity'),
	  maxquantity: button.data('maxquantity'),
	  orderCap: button.data('ordercap'),
      label: button.data('label'),
      image: button.data('image')
    }
    Cart.addItem(item);
  });

  var updateReport = function() {
    var count = Cart.itemsCount();
    $('.cart-items-count').text(count);
    $('.cart-subtotal').html(Cart.displayPrice(Cart.subTotal()));
    if (count===1) {
      $('.cart-items-count-singular').show();
      $('.cart-items-count-plural').hide();
    } else {
      $('.cart-items-count-singular').hide();
      $('.cart-items-count-plural').show();
    }
  };

  var updateCart = function() {
    if (Cart.items.length>0) {
      var template = Cart.templateCompiler(Cart.lineItemTemplate);
      var lineItems = "";
      for (var i = 0; i<Cart.items.length; i++) {
        lineItems += template(Cart.items[i]);
      }
      $('.cart-line-items').html(lineItems);
      $('.cart-table').show();
      $('.cart-is-empty').hide();
    } else {
      $('.cart-table').hide();
      $('.cart-is-empty').show();
    }
  };

  var update = function() {
    updateReport();
    updateCart();
  };
  update();

  Cart.on('saved', update);

  return Cart;
};

