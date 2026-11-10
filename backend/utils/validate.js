const MAX_IMAGE_CHARS = 2 * 1024 * 1024; // ~1.5MB ảnh

// hinhanh hợp lệ: rỗng, chuỗi base64 "data:image/...;base64,..." hoặc link http(s)
function checkImage(hinhanh) {
  if (hinhanh === undefined || hinhanh === '') return null;
  if (typeof hinhanh !== 'string') return 'Hình ảnh không hợp lệ';
  if (!/^data:image\/[a-z+.-]+;base64,/i.test(hinhanh) && !/^https?:\/\//i.test(hinhanh))
    return 'Hình ảnh phải là ảnh base64 hoặc đường link';
  if (hinhanh.length > MAX_IMAGE_CHARS) return 'Ảnh quá lớn (tối đa ~1.5MB)';
  return null;
}

module.exports = { checkImage };
