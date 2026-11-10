import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

// Chọn file JSON/CSV và đọc nội dung. Trả về null nếu người dùng bấm hủy.
export async function pickTextFile() {
  const res = await DocumentPicker.getDocumentAsync({
    // Android hay gán sai kiểu MIME cho .csv nên trên điện thoại cho chọn mọi file, kiểm tra đuôi sau
    type: Platform.OS === 'web' ? ['.json', '.csv', 'application/json', 'text/csv'] : '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const name = asset.name || 'file';
  if (!/\.(json|csv)$/i.test(name)) throw new Error('Chỉ hỗ trợ file .json hoặc .csv');
  const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return { name, text };
}

// Đọc CSV có dòng tiêu đề. Hỗ trợ dấu phân cách "," hoặc ";" (Excel tiếng Việt), ô có ngoặc kép, BOM UTF-8.
export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim()));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0].map((h) => h.trim().toLowerCase());
  if (!header.includes('email')) throw new Error('File CSV phải có dòng tiêu đề: email,matkhau,hoten,hinhanh');
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// Chuyển nội dung file thành mảng { email, matkhau, hoten, hinhanh }; bỏ qua _id và mọi trường khác.
export function parseUsers(name, text) {
  let rows;
  const isJson = /\.json$/i.test(name) || /^\s*[[{]/.test(text);
  if (isJson) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('File JSON không hợp lệ');
    }
    rows = Array.isArray(data) ? data : data?.users;
    if (!Array.isArray(rows)) throw new Error('File JSON phải là một mảng người dùng');
  } else {
    rows = parseCSV(text);
  }
  return rows.map((r) => ({
    email: r?.email ?? '',
    matkhau: r?.matkhau ?? '',
    hoten: r?.hoten ?? '',
    hinhanh: r?.hinhanh ?? '',
  }));
}
