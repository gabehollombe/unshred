(function() {
  var CanvasImage, Deshredder;
  CanvasImage = (function() {
    function CanvasImage(width, height) {
      this.width = width;
      this.height = height;
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.ctx = this.canvas.getContext('2d');
      if (this.image_data != null) {
        this.ctx.putImageData(this.image_data, 0, 0);
      }
    }
    CanvasImage.prototype.drawImage = function(img) {
      this.width = this.canvas.width = img.width;
      this.height = this.canvas.height = img.height;
      this.ctx.drawImage(img, 0, 0);
      return this;
    };
    CanvasImage.prototype.putImageData = function(img_data, x, y, opts) {
      if (x == null) {
        x = 0;
      }
      if (y == null) {
        y = 0;
      }
      if (opts == null) {
        opts = {
          update_dimensions: false
        };
      }
      if (opts.update_dimensions) {
        this.width = this.canvas.width = img_data.width;
        this.height = this.canvas.height = img_data.height;
      }
      this.ctx.putImageData(img_data, x, y);
      return this.image_data = this.getImageData();
    };
    CanvasImage.prototype.getImageData = function(x, y, w, h) {
      if (x == null) {
        x = 0;
      }
      if (y == null) {
        y = 0;
      }
      if (w == null) {
        w = this.width;
      }
      if (h == null) {
        h = this.height;
      }
      return this.ctx.getImageData(x, y, w, h);
    };
    CanvasImage.prototype.getPixelData = function(x, y) {
      var px_index;
      px_index = (y * (this.image_data.width * 4)) + (x * 4);
      return {
        red: this.image_data.data[px_index + 0],
        green: this.image_data.data[px_index + 1],
        blue: this.image_data.data[px_index + 2],
        alpha: this.image_data.data[px_index + 3]
      };
    };
    CanvasImage.prototype.appendImage = function(c_img) {
      var new_width, old_width;
      old_width = this.width;
      new_width = old_width + c_img.width;
      this.width = this.canvas.width = new_width;
      this.putImageData(this.image_data, 0, 0);
      return this.putImageData(c_img.getImageData(), old_width, 0);
    };
    CanvasImage.prototype.prependImage = function(c_img) {
      var new_width, old_width, temp_img_data;
      old_width = this.width;
      new_width = old_width + c_img.width;
      this.width = this.canvas.width = new_width;
      temp_img_data = this.image_data;
      this.putImageData(c_img.getImageData(), 0, 0);
      return this.putImageData(temp_img_data, c_img.width, 0);
    };
    return CanvasImage;
  })();
  Deshredder = {
    get_pixel_similarity_score_for_seam_between: function(a, b) {
      var ax, bx, diff_threshold, pixel_a, pixel_b, pixel_bd, pixel_bu, score, y, _ref;
      diff_threshold = 50;
      score = 0;
      ax = a.width - 1;
      bx = 0;
      for (y = 1, _ref = a.height - 1; 1 <= _ref ? y < _ref : y > _ref; 1 <= _ref ? y++ : y--) {
        pixel_a = a.getPixelData(ax, y);
        pixel_b = b.getPixelData(bx, y);
        if (this.get_pixel_distances(pixel_a, pixel_b).sum < diff_threshold) {
          score += 1;
        }
        pixel_bu = b.getPixelData(bx, y - 1);
        if (this.get_pixel_distances(pixel_a, pixel_bu).sum < diff_threshold) {
          score += 1;
        }
        pixel_bd = b.getPixelData(bx, y + 1);
        if (this.get_pixel_distances(pixel_a, pixel_bd).sum < diff_threshold) {
          score += 1;
        }
      }
      return score;
    },
    get_pixel_distances: function(p1, p2) {
      var distances;
      distances = {
        red: Math.abs(p1.red - p2.red),
        green: Math.abs(p1.green - p2.green),
        blue: Math.abs(p1.blue - p2.blue),
        alpha: Math.abs(p1.alpha - p2.alpha)
      };
      distances.sum = distances.red + distances.green + distances.blue + distances.alpha;
      return distances;
    },
    deshred: function(args) {
      var best_index, best_new_img, best_position, best_score, best_shred, canvas_image, finished_image, height, image_data, index, score, shred, shred_width, shreds, strip_data, unmatched_shreds, width, x, _len, _ref;
      shreds = args.shreds;
      shred_width = args.width / args.shreds;
      width = args.width;
      height = args.height;
      image_data = args.image_data;
      unmatched_shreds = [];
      shred_width = args.width / args.shreds;
      for (x = 0, _ref = args.width; 0 <= _ref ? x < _ref : x > _ref; x += shred_width) {
        strip_data = window.scrambled_img.getImageData(x, 0, shred_width, height);
        canvas_image = new CanvasImage(shred_width, args.height);
        canvas_image.putImageData(strip_data, 0, 0);
        unmatched_shreds.push(canvas_image);
      }
      finished_image = unmatched_shreds.splice(0, 1)[0];
      while (unmatched_shreds.length > 0) {
        best_new_img = null;
        best_score = 0;
        best_index = null;
        best_position = null;
        for (index = 0, _len = unmatched_shreds.length; index < _len; index++) {
          shred = unmatched_shreds[index];
          score = this.get_pixel_similarity_score_for_seam_between(finished_image, shred);
          if (score > best_score) {
            best_position = 'right_of_finished';
            best_index = index;
            best_score = score;
          }
          score = this.get_pixel_similarity_score_for_seam_between(shred, finished_image);
          if (score > best_score) {
            best_position = 'left_of_finished';
            best_index = index;
            best_score = score;
          }
        }
        best_shred = unmatched_shreds.splice(best_index, 1)[0];
        if (best_position === 'right_of_finished') {
          finished_image.appendImage(best_shred);
        } else {
          finished_image.prependImage(best_shred);
        }
      }
      return document.getElementById('deshredded').getContext('2d').putImageData(finished_image.getImageData(), 0, 0);
    }
  };
  $(window).load(function() {
    var img;
    img = document.getElementById('shredded');
    window.scrambled_img = new CanvasImage().drawImage(img);
    return Deshredder.deshred({
      shreds: 20,
      width: 640,
      height: 359,
      image_data: scrambled_img.getImageData()
    });
  });
}).call(this);
