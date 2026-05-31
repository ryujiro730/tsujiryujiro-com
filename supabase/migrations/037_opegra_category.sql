-- opegra_photosにカテゴリカラムを追加（汎用素材の分類用）
alter table opegra_photos
  add column if not exists category text;

alter table opegra_photos
  drop constraint if exists opegra_photos_category_check;

alter table opegra_photos
  add constraint opegra_photos_category_check
  check (category is null or category in ('food', 'scenery', 'hobby', 'other'));
