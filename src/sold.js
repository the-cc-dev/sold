var fs = require('fs');
var marked = require('meta-marked');
var path = require('path');
var mkdirp = require('mkdirp');
var ncp = require('ncp');
var Mustache = require("mustache");
var log = require('./util.js').log;
var error = require("./util.js").error;

function Sold(dir) {
    if (!(this instanceof Sold)) return new Sold(dir);
    log("======= Sold =======", "blue");
    log("  => intializing", "blue");
    this.directory = dir;
    this.posts = [];
    this.data({});
    this.source("src");
    this.postSource("posts");
    this.destination("build");
    this.template("template");
    log("     success\n", "green");
}

Sold.prototype.postSource = function(location) {
  this._postSource = path.join(this._source, location);
  this._postSourcePath = location;
  return this;
};

Sold.prototype.source = function(location) {
  this._source = path.join(this.directory, location);
  return this;
};

Sold.prototype.destination = function(location) {
  this._destination = path.join(this.directory, location);
  this._postDestination = path.join(this._destination, this._postSourcePath)
  return this;
};

Sold.prototype.template = function(location) {
  this._template = path.join(this.directory, location);
  this._homeTemplate = path.join(this.directory, location, "index.html");
  this._postTemplate = path.join(this.directory, location, "post.html");
  return this;
};

Sold.prototype.data = function(data) {
  this._data = data;
  return this;
}


Sold.prototype.build = function() {
  log("  => building", "blue");
  this._data.posts = [];
  var data = this._data;

  var destination = this._destination;
  var postDestination = this._postDestination;

  var source = this._source;
  var postSource = this._postSource;

  var postTemplate = fs.readFileSync(this._postTemplate).toString();
  var postTemplatePath = this._postTemplate;
  var homeTemplate = fs.readFileSync(this._homeTemplate).toString();
  var homeTemplatePath = this._homeTemplate;
  var template = this._template;

  // Make destination directory
  mkdirp(postDestination, (err) => {
    if(err) {
      error("Could not create \"" + postDestination + "\" Directory");
    }

    // Read the source directory
    var files = fs.readdirSync(postSource);

    for(var i = 0; i < files.length; i++) {
      var file = files[i];

      // Read file in source directory
      var content = fs.readFileSync(path.join(postSource, file));

      // Turn destination file to an html file
      var destinationFile = file.split(".")
      destinationFile.pop();
      destinationFile = destinationFile.join(".") + ".html";

      // Compile the data into the post template
      var postData = postTemplate;
      var compiled = marked(content.toString());
      var metadata = compiled.meta;
      var html = compiled.html;
      metadata["title"] = metadata.title;
      metadata["author"] = metadata.author;
      metadata["description"] = metadata.description;
      metadata["content"] = html;
      metadata["file"] = destinationFile;
      data.posts.push(metadata);

      for(var key in metadata) {
        metadata["post-" + key] = metadata[key];
        delete metadata[key];
      }

      postData = Mustache.render(postData, metadata);

      // Write destination file
      fs.writeFileSync(path.join(postDestination, destinationFile), postData);
    }

    // Compile home template
    var compiledHomeTemplate = homeTemplate;
    compiledHomeTemplate = Mustache.render(compiledHomeTemplate, data);

    // Write home template
    fs.writeFileSync(path.join(this._destination, "index.html"), compiledHomeTemplate);

    // Copy any other assets in the template to the destination
    ncp(template, destination, {
      filter: function(fileName) {
        return (fileName !== homeTemplatePath) && (fileName !== postTemplatePath);
      }
    }, function (err) {
      if(err) {
        error("Could not build assets");
      }
    });

  });
  log("     success\n", "green");
}


module.exports = Sold;
