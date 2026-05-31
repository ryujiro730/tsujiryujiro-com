-- opegra_photosにファイルハッシュカラムを追加（重複検出用）
alter table opegra_photos
  add column if not exists file_hash text;

create index if not exists opegra_photos_file_hash_idx on opegra_photos(file_hash)
  where file_hash is not null;
