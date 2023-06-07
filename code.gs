function onOpen(e) {

  //Creates premise filler words for argument structure
 var body = DocumentApp.getActiveDocument().getBody();
     
  // Clear the text surrounding "Argument Intro:", with or without text.
  body.replaceText("^.*Citation ?One.*$", "Gaber, Seif. HackIllinois Hackathon. Spotyr™ Version 3.0, 10, DevPost, February 25 2018, Champaign, Illinois. In addition to the previously stated fact, Heart diseases");
  
  // Use editAsText to obtain a single text element containing all the characters in the document.
  var text = body.editAsText();

  var keyWord = 'pigeons';
  var response = UrlFetchApp.fetch('https://api.duckduckgo.com/?q=' + keyWord + '&format=json');
  var result = JSON.parse(response.getContentText());
  Logger.log(result['RelatedTopics'][0]['Text']); 
  
  // Insert text at the beginning of the document.
  var start = text.insertText(0, 'According to the Britannica Encyclopedia section on ' + keyWord + ', ');

  // Insert text at the end of the document.
  text.appendText(' In addition to the previously stated fact, ' + result['RelatedTopics'][0]['Text']);
  
  DocumentApp.getUi().createAddonMenu()
      .addItem('Start', 'showSidebar')
      .addToUi();
}

//Runs when the add-on is installed.
function onInstall(e) {
  onOpen(e);
}

//Opens a sidebar in the document containing the add-on's user interface.
function showSidebar() {
  var ui = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Spotyr™');
  DocumentApp.getUi().showSidebar(ui);
}

//Gets the text the user has selected. 
function getSelectedText() {
  var selection = DocumentApp.getActiveDocument().getSelection();
  if (selection) {
    var text = [];
    var elements = selection.getSelectedElements();
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].isPartial()) {
        var element = elements[i].getElement().asText();
        var startIndex = elements[i].getStartOffset();
        var endIndex = elements[i].getEndOffsetInclusive();

        text.push(element.getText().substring(startIndex, endIndex + 1));
      } else {
        var element = elements[i].getElement();
        // Only translate elements that can be edited as text; skip images and
        // other non-text elements.
        if (element.editAsText) {
          var elementText = element.asText().getText();
          // This check is necessary to exclude images, which return a blank
          // text element.
          if (elementText != '') {
            text.push(elementText);
          }
        }
      }
    }
    if (text.length == 0) {
      throw 'Please select some text.';
    }
    return text;
  } else {
    throw 'Please select some text.';
  }
}

//Gets the stored user preferences for the origin and destination languages, if they exist.
function getPreferences() {
  var userProperties = PropertiesService.getUserProperties();
  var languagePrefs = {
    originLang: userProperties.getProperty('originLang'),
    destLang: userProperties.getProperty('destLang')
  };
  return languagePrefs;
}

//Gets the user-selected text and translates it from the origin language to the destination language. 
function getTextAndCitation(origin, dest, savePrefs) {
  var result = {};
  var text = getSelectedText();
  //result['text'] = text.join('\n');

  var response = UrlFetchApp.fetch('https://api.duckduckgo.com/?q=' + text + '&format=json');
  var result1 = JSON.parse(response.getContentText());
  

  result['translation'] = Logger.log(result1['RelatedTopics'][0]['Text']);

  return result;
}

//Replaces the text of the current selection with the provided text, or inserts text at the current cursor location.
function insertText(newText) {
  var selection = DocumentApp.getActiveDocument().getSelection();
  if (selection) {
    var replaced = false;
    var elements = selection.getSelectedElements();
    if (elements.length == 1 &&
        elements[0].getElement().getType() ==
        DocumentApp.ElementType.INLINE_IMAGE) {
      throw "Can't insert text into an image.";
    }
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].isPartial()) {
        var element = elements[i].getElement().asText();
        var startIndex = elements[i].getStartOffset();
        var endIndex = elements[i].getEndOffsetInclusive();

        var remainingText = element.getText().substring(endIndex + 1);
        element.deleteText(startIndex, endIndex);
        if (!replaced) {
          element.insertText(startIndex, newText);
          replaced = true;
        } else {
          // This block handles a selection that ends with a partial element. We
          // want to copy this partial text to the previous element so we don't
          // have a line-break before the last partial.
          var parent = element.getParent();
          parent.getPreviousSibling().asText().appendText(remainingText);
          // We cannot remove the last paragraph of a doc. If this is the case,
          // just remove the text within the last paragraph instead.
          if (parent.getNextSibling()) {
            parent.removeFromParent();
          } else {
            element.removeFromParent();
          }
        }
      } else {
        var element = elements[i].getElement();
        if (!replaced && element.editAsText) {
          // Only translate elements that can be edited as text, removing other elements.
          element.clear();
          element.asText().setText(newText);
          replaced = true;
        } else {
          // We cannot remove the last paragraph of a doc. If this is the case,just clear the element.
          if (element.getNextSibling()) {
            element.removeFromParent();
          } else {
            element.clear();
          }
        }
      }
    }
  } else {
    var cursor = DocumentApp.getActiveDocument().getCursor();
    var surroundingText = cursor.getSurroundingText().getText();
    var surroundingTextOffset = cursor.getSurroundingTextOffset();

    // If the cursor follows or preceds a non-space character, insert a space
    // between the character and the translation. Otherwise, just insert the translation.
    if (surroundingTextOffset > 0) {
      if (surroundingText.charAt(surroundingTextOffset - 1) != ' ') {
        newText = ' ' + newText;
      }
    }
    if (surroundingTextOffset < surroundingText.length) {
      if (surroundingText.charAt(surroundingTextOffset) != ' ') {
        newText += ' ';
      }
    }
    cursor.insertText(newText);
  }
}
