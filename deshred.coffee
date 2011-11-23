class CanvasImage
  constructor: (@width, @height) ->
    @canvas = document.createElement('canvas')
    @canvas.width = @width
    @canvas.height = @height
    @ctx = @canvas.getContext('2d')
    @ctx.putImageData(@image_data, 0, 0) if @image_data?

  drawImage: (img) -> 
    @width = @canvas.width = img.width
    @height = @canvas.height = img.height
    @ctx.drawImage img, 0, 0
    @

  putImageData: (img_data, x=0, y=0, opts={update_dimensions: false}) -> 
    if opts.update_dimensions
      @width = @canvas.width = img_data.width
      @height = @canvas.height = img_data.height
    @ctx.putImageData img_data, x, y
    @image_data = @getImageData()

  getImageData: (x=0, y=0, w=@width, h=@height) -> @ctx.getImageData x, y, w, h

  getPixelData: (x, y) ->
    # each pixel is represented by 4 entries in the array, R, G, B, and A
    px_index = ((y*(@image_data.width*4)) + (x*4))
    {
      red:   @image_data.data[px_index + 0],
      green: @image_data.data[px_index + 1],
      blue:  @image_data.data[px_index + 2],
      alpha: @image_data.data[px_index + 3],
    }

  appendImage: (c_img) ->
    old_width = @width
    new_width =  old_width + c_img.width
    @width = @canvas.width = new_width
    @putImageData(@image_data, 0, 0)
    @putImageData(c_img.getImageData(), old_width, 0)

  prependImage: (c_img) ->
    old_width = @width
    new_width =  old_width + c_img.width
    @width = @canvas.width = new_width
    temp_img_data = @image_data
    @putImageData(c_img.getImageData(), 0, 0)
    @putImageData(temp_img_data, c_img.width, 0)

Deshredder = 
  get_pixel_similarity_score_for_seam_between: (a, b) ->
    diff_threshold = 50
    score = 0
    ax = a.width - 1
    bx = 0
    # Start one row down and end one row from the bottom because we'll be comparing each right pix with the pixel to the right of it and also one up and down from the one on the right.  We don't just compare pixels next to each other because it doesn't handle black/white diagonals well.
    for y in [1...a.height-1]
      #compare pixel a with pixel b 
      pixel_a = a.getPixelData(ax, y)
      pixel_b = b.getPixelData(bx, y)
      score += 1 if @get_pixel_distances(pixel_a, pixel_b).sum < diff_threshold
      #compare pixel a with one above pixel b
      pixel_bu = b.getPixelData(bx, y-1)
      score += 1 if @get_pixel_distances(pixel_a, pixel_bu).sum < diff_threshold
      #compare pixel a with one below pixel b
      pixel_bd = b.getPixelData(bx, y+1)
      score += 1 if @get_pixel_distances(pixel_a, pixel_bd).sum < diff_threshold
    score


  get_pixel_distances: (p1, p2) ->
    distances = 
    {
      red:   Math.abs(p1.red - p2.red)
      green: Math.abs(p1.green - p2.green)
      blue:  Math.abs(p1.blue - p2.blue)
      alpha: Math.abs(p1.alpha - p2.alpha)
    }
    distances.sum = distances.red + distances.green + distances.blue + distances.alpha
    distances


  deshred: (args) ->
    shreds = args.shreds
    shred_width = args.width / args.shreds
    width = args.width
    height = args.height
    image_data = args.image_data

    # 1. slice up original image into one image per shred
    unmatched_shreds = []
    shred_width = args.width / args.shreds
    for x in [0...args.width] by shred_width
      strip_data = window.scrambled_img.getImageData(x, 0, shred_width, height)
      canvas_image = new CanvasImage(shred_width, args.height)
      canvas_image.putImageData(strip_data, 0, 0)
      unmatched_shreds.push canvas_image

    # 2. start off our finished image with shred 0
    finished_image = unmatched_shreds.splice(0, 1)[0]

    #while we have unmatched shreds left, find the best candidate from the leftover shreds
    while unmatched_shreds.length > 0
      best_new_img = null
      best_score = 0
      best_index = null
      best_position = null
      for shred, index in unmatched_shreds
        #see how this shred scores when placed to the left of the matched shreds
        score = @get_pixel_similarity_score_for_seam_between(finished_image, shred)
        if score > best_score
          best_position = 'right_of_finished'
          best_index = index
          best_score = score
        #see how this shred scores when placed to the right
        score = @get_pixel_similarity_score_for_seam_between(shred, finished_image)
        if score > best_score
          best_position = 'left_of_finished'
          best_index = index
          best_score = score

      # remove best match from the unmatched_shreds
      best_shred = unmatched_shreds.splice(best_index, 1)[0]

      # 4. make a new image with the best shred on the correct side of the already matched shreds
      if best_position == 'right_of_finished'
        finished_image.appendImage(best_shred)
      else 
        finished_image.prependImage(best_shred)


    # put our finished image into the placeholder canvas element on the page
    document.getElementById('deshredded').getContext('2d').putImageData(finished_image.getImageData(), 0, 0)


$(window).load ->
  img = document.getElementById('shredded')
  window.scrambled_img = new CanvasImage().drawImage(img)
  Deshredder.deshred(shreds: 20, width: 640, height: 359, image_data: scrambled_img.getImageData()) #TODO: put args here
