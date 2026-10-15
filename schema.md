# PortalGenius — Kontrak Data dan API

Versi 1.0. Ini skema logis yang harus diterjemahkan ke migrasi, bukan SQL yang sudah diterapkan. PostgreSQL merupakan sumber utama. Schema public untuk data aplikasi ber-RLS; private untuk data autentikasi internal. Password hanya dikelola Supabase Auth.

## Konvensi
PK UUID server-generated kecuali auth_user_id merujuk auth.users.id. Semua tabel bisnis memiliki created_at/updated_at timestamptz UTC; tanggal pembelajaran memakai date lokal Asia/Jakarta. Record mutable memiliki version integer >=1. Foreign key RESTRICT untuk master historis; CASCADE hanya child draft yang benar-benar dimiliki parent. NIS/telepon disimpan text; trim nama, jangan paksa nama depan/belakang. Semua field tidak-null kecuali bertanda `?`. Arsip menggunakan archived_at?, bukan menghapus histori.

## Entitas
| ID | Tabel | Field utama dan relasi | Kebutuhan |
|---|---|---|---|
| ENT-001 | school_settings | id, name text, address text?, city text, timezone text, principal_name text?, report_template_version text | REQ-003, REQ-009 |
| ENT-002 | accounts | auth_user_id PK/FK, display_name text, active bool, must_change_password bool | REQ-001, REQ-002 |
| ENT-003 | account_roles | account_id FK, role enum; PK(account_id,role) | REQ-002 |
| ENT-004 | teachers | id, account_id unique FK, code unique text, archived_at? | REQ-003 |
| ENT-005 | students | id, nis unique text, full_name text, birth_place text?, birth_date date?, registration_date date?, archived_at? | REQ-003 |
| ENT-006 | student_guardians | id, student_id FK, name text, relation text?, phone text?, address text?, is_primary bool | REQ-003 |
| ENT-007 | academic_years / terms | year: id,label,start_date,end_date; term: id,year_id FK,name,start_date,end_date,locked bool | REQ-003 |
| ENT-008 | classes / programs | class: id,year_id FK,level enum,grade int,name text; program: id,code unique,name text,archived_at? | REQ-003 |
| ENT-009 | enrollments | id,student_id FK,class_id FK,program_id FK,start_date,end_date? | REQ-003, REQ-004 |
| ENT-010 | subjects | id,code unique,name text,archived_at? | REQ-003 |
| ENT-011 | learning_groups / group_members | group: id,term_id FK,name,type enum; member: group_id FK,student_id FK,valid_from,valid_to? | REQ-004 |
| ENT-012 | teaching_assignments / assignment_students | assignment: id,teacher_id FK,subject_id FK,term_id FK,valid_from,valid_to; child: assignment_id FK,student_id FK,valid_from,valid_to | REQ-002, REQ-004 |
| ENT-013 | counselor_assignments | id,account_id FK,student_id FK,valid_from,valid_to | REQ-002, REQ-008 |
| ENT-014 | journals | id,assignment_id FK,group_id? FK,date,session_label text,session_units int,method enum,material text,status enum,submitted_at?,version | REQ-005, REQ-006 |
| ENT-015 | journal_participants | id,journal_id FK,student_id FK,attendance enum?,attendance_note text?,daily_score numeric?,academic_note text?,attitude_note text?, UNIQUE(journal_id,student_id) | REQ-005, REQ-006 |
| ENT-016 | grading_policies | id,subject_id FK,term_id FK,revision int,weights jsonb,status enum,activated_at?; UNIQUE(subject_id,term_id,revision) | REQ-007 |
| ENT-017 | assessments / assessment_scores | assessment: id,assignment_id FK,category enum,title,date,max_score numeric,required bool; score: assessment_id FK,student_id FK,raw_score numeric?,version; composite PK | REQ-007 |
| ENT-018 | monthly_developments | id,student_id FK,term_id FK,month date,ratings jsonb,description text?,suggestion text?,no_notes bool,status enum,author_id FK,version; UNIQUE(student_id,term_id,month) | REQ-008 |
| ENT-019 | counselor_private_notes | id,student_id FK,author_id FK,date,body text; never in report projection | REQ-008 |
| ENT-020 | monthly_reports | id,student_id FK,term_id FK,month date,kind enum,status enum,review_note text?,version; UNIQUE(student_id,term_id,month,kind) | REQ-009, REQ-010 |
| ENT-021 | report_versions | id,report_id FK,revision int,snapshot jsonb,source_revision text,template_version text,policy_ids uuid[],finalized_by FK,finalized_at,reason text?; UNIQUE(report_id,revision) | REQ-010, REQ-011 |
| ENT-022 | audit_events | id,actor_id?,action text,entity_type text,entity_id?,changed_fields text[],request_id text,created_at | REQ-014 |
| ENT-023 | private.login_identities | auth_user_id PK,username_normalized unique,auth_alias unique,provisioning_state enum | REQ-001 |
| ENT-024 | private.app_sessions | id,handle_hash unique,auth_user_id FK,encrypted_tokens text,key_version int,auth_session_id?,expires_at,last_seen_at,revoked_at?,refresh_lease_until?,version | REQ-001 |
| ENT-025 | private.rate_limit_buckets | key_hash PK,window_start,attempt_count,expires_at | REQ-001 |
| ENT-026 | private.idempotency_records | actor_id,operation,key uuid,request_hash,response_ref?,expires_at; UNIQUE(actor_id,operation,key) | REQ-005, REQ-010 |

Group membership sertakan masa berlaku. Saat admin membuat assignment dari kelompok, copy daftar anggota ke assignment_students; perubahan kelompok tidak otomatis memberi akses baru tanpa tindakan admin. Kehadiran peserta historis tetap dapat dibaca guru pembuat jurnal setelah assignment berakhir, tetapi akses siswa saat ini tidak melebar. Kebijakan default: penugasan yang diarsip tidak dapat membuat jurnal baru.

## Domain dan validasi
- Username: lowercase setelah trim, 3–32 karakter `[a-z0-9._-]`, unik tanpa membedakan kapital; reservasi nama sistem; jangan gunakan nama sebagai FK. Display name 1–120 karakter. Password usulan 12–128 karakter, dukung paste/password manager.
- NIS 1–32 karakter; nama siswa/wali 1–160; phone maksimal 30, alamat maksimal 1000. Data profil yang belum lengkap boleh draft, tetapi bagian identitas laporan wajib lengkap sebelum final atau diberi pengecualian admin dengan alasan.
- Jenjang SD grade 1–6, SMP 7–9, SMA 10–12. Satu enrollment aktif pada satu tanggal; term berada dalam year, tidak tumpang tindih dalam tahun yang sama. Program Regular/Independent sebagai katalog awal usulan, tidak hard-code sebagai enum.
- Role admin/teacher/counselor/principal. Multi-role berupa baris berbeda. Aktor tidak dapat menambah role dirinya tanpa hak admin yang sudah berlaku.
- Journal status draft/submitted. Method face_to_face/zoom/independence. Attendance present/sick/excused/absent. Draft boleh null; submit wajib attendance seluruh peserta. Satu journal satu metode; kelas hybrid dibuat per metode dalam pertemuan terpisah dan hindari peserta ganda pada sesi yang sama.
- session_units integer 1–8, default 1 sebagai usulan; label sesi maksimal 40. Dua jam/sesi berurutan dengan status sama boleh units=2. Jika status berubah, pisah journal. Material 1–4000; catatan maksimal 4000. Nilai harian 0–100 opsional. Draft tidak masuk rekap. Materi sama tidak menjadi uniqueness key.
- Nilai journal_participants.daily_score adalah observasi, bukan komponen UH otomatis. Assessments category assignment/daily_test/midterm/finalterm; max_score >0, raw_score 0..max_score atau null. Semua assessment required yang berlaku bagi siswa harus diisi sebelum nilai akhir.
- Enam indikator sikap: diligence, courtesy, discipline, responsibility, tolerance, communication. Rubrik A/B/C/D usulan; artinya ditetapkan lembaga sebelum M-005. monthly_developments.status draft/submitted, bulan disimpan hari pertama. no_notes=true berarti pernyataan eksplisit, bukan menganggap blank lengkap.
- Report kind progress/grades; status draft/in_review/final. Month seluruhnya berada dalam term sebagai default; bila kalender lembaga memotong bulan di tengah term, ubah aturan dengan keputusan produk sebelum implementasi.

## Aturan kehadiran
Satu participant journal menyumbang session_units. Hitung enam kategori keluaran saling eksklusif: Hadir = present + face_to_face; Zoom = present + zoom; Independence = present + independence; Sakit/Izin/Alpa = status non-present pada metode apa pun. Jumlah enam kategori = total sesi peserta pada jurnal submitted. Rekap hadir keseluruhan = Hadir + Zoom + Independence, beri label berbeda. Jangan menyebut total jurnal sebagai total hari. Belum ada jadwal wajib, sehingga persentase kehadiran tidak ditampilkan.

## Aturan nilai
Normalisasi skor 100*raw_score/max_score; rerata aritmetika tiap kategori yang memiliki bobot >0, kemudian jumlah rerata*bobot/100. Bobot basis points integer per kategori berjumlah 10000, dapat nol; kategori berbobot nol tidak menghalangi final. Jika kategori berbobot positif tidak memiliki assessment atau ada required score null: hasil null dan missing_components, tidak menormalisasi ulang bobot. Nol dihitung sebagai skor. Decimal presisi penuh di DB, round half-up dua desimal pada hasil akhir. Nilai tambahan optional hanya masuk rerata jika terisi. Remedial versi pertama berupa koreksi score beralasan dengan audit; tidak ada aturan max/latest otomatis. Kebijakan aktif immutable; edit menghasilkan revision baru. Laporan grades menyimpan policy IDs dan hasil pada snapshot. Finalisasi perkembangan bulanan tidak bergantung nilai semester yang belum waktunya.

## Otorisasi data
| Data | Admin | Guru | Konselor | Kepala sekolah |
|---|---|---|---|---|
| Master akademik | Kelola | Baca proyeksi penugasan | Baca siswa dampingan | Baca ringkasan |
| Wali/kontak | Kelola | Tidak secara default | Tidak secara default | Identitas terbatas dalam laporan final |
| Jurnal/nilai | Kelola dan audit | Penugasan sendiri | Tidak secara default | Ringkasan/final |
| Sikap publik bulanan | Periksa/kelola | Catatan jurnal sendiri | Siswa dampingan | Laporan final |
| Catatan internal konselor | Tidak kecuali juga ditugaskan konselor | Tidak | Penugasan sendiri | Tidak |
| Laporan | Draft/final/revisi | Tidak secara default | Bahan perkembangan penugasannya | Final read-only |
| Akun/role | Kelola | Profil sendiri | Profil sendiri | Profil sendiri |

Guru mengubah submitted journal hanya jika tidak terkunci final terkait; sesudah itu mengajukan koreksi lewat admin (usulan default). Admin dapat mengoreksi sumber dengan alasan, tetapi snapshot final lama tetap. Semua permission diterapkan server/RLS, bukan hanya tampilan. Query proyeksi jangan SELECT * untuk profil siswa.

## API v1 yang direncanakan
Semua routes same-origin, JSON. Response sukses `{data,meta:{requestId}}`; error `{error:{code,message,fields?},requestId}` tanpa stack/secrets. Pagination cursor opaque, limit default 25 max 100; ekspor menyelesaikan semua halaman sesuai filter, tidak diam-diam truncation. Sort stabil tanggal lalu ID.

| Endpoint | Metode/aksi | Akses |
|---|---|---|
| /api/v1/auth/login | POST username,password | Publik, rate-limited |
| /api/v1/auth/session | GET profil/roles/CSRF | Sesi aktif |
| /api/v1/auth/logout | POST revoke sesi | Sesi |
| /api/v1/auth/password | POST currentPassword,newPassword | Pemilik sesi, termasuk must-change |
| /api/v1/accounts | POST provisioning; GET daftar | Admin |
| /api/v1/accounts/:id/reset-password | POST password sementara | Admin + autentikasi ulang |
| /api/v1/accounts/:id | PATCH role/active | Admin |
| /api/v1/students, /teachers, /subjects, /periods, /groups, /assignments | GET/POST/PATCH per resource terpisah | Menurut matriks; bukan satu handler CRUD raksasa |
| /api/v1/journals | GET filter; POST create/draft | Guru berwenang/admin |
| /api/v1/journals/:id | GET/PATCH | Pemilik penugasan/admin |
| /api/v1/journals/:id/submit | POST | Pemilik/admin |
| /api/v1/grading-policies | GET/POST/activate | Baca sesuai akses; tulis admin |
| /api/v1/assessments dan /assessments/:id/scores | GET/POST/PATCH | Guru penugasan/admin |
| /api/v1/developments | GET/POST/PATCH | Konselor penugasan/admin |
| /api/v1/counselor-notes | GET/POST/PATCH | Konselor ditugaskan |
| /api/v1/reports/preview | POST studentId,termId,month,kind | Admin |
| /api/v1/reports/:id/review | POST action,note,expectedVersion | Admin |
| /api/v1/reports/:id/finalize | POST sourceRevision,expectedVersion | Admin |
| /api/v1/reports/:id/revisions | POST reason,expectedVersion | Admin |
| /api/v1/report-versions/:id | GET immutable snapshot | Admin/kepala sekolah |
| /api/v1/exports/recap | GET period/filter/cursor | Admin/kepala sekolah sesuai cakupan |
| /api/v1/dashboard | GET periode | Sesuai role |

Prefix API bagi shorthand resource di tabel selalu /api/v1. Endpoint umum masih harus dipecah menjadi file route spesifik saat implementasi.

Contoh create jurnal (ID hanya ilustrasi sintetis):
```json
{"assignmentId":"11111111-1111-4111-8111-111111111111","date":"2026-10-14","sessionLabel":"1–2","sessionUnits":2,"method":"zoom","material":"Pecahan","status":"draft","participants":[{"studentId":"22222222-2222-4222-8222-222222222222","attendance":"present","dailyScore":80,"academicNote":"Mampu menyederhanakan pecahan.","attitudeNote":"Mengikuti diskusi dengan tertib."}]}
```
Mutation create/finalize memakai header Idempotency-Key UUID. Record disimpan 24 jam (asumsi); request hash berbeda dengan key sama ->409. PATCH mengirim expectedVersion; update WHERE version=expectedVersion lalu increment dalam transaksi. HTTP 401 sesi invalid, 403 akses ditolak, 404 tidak ditemukan/tidak terlihat, 409 konflik/idempotency, 422 field invalid, 429 limit, 503 provider gagal.

## Snapshot, konsistensi, lifecycle
Snapshot minimal berisi identity, guardian report subset, period, enrollment-at-period, ordered journal rows, attendance summary, ratings, counselor publishable description/suggestion, signatory display names, template version, source IDs+versions, dan grading results bila kind=grades. Bukan referensi hidup saja. Review hanya untuk workflow; finalisasi tidak boleh menulis grade/journal. Sumber dikunci/diperiksa revision pada transaksi agar preview basi ditolak.
Index: journals(assignment_id,date,id), journal_participants(student_id,journal_id), scores(student_id,assessment_id), assignments(teacher_id,term_id), reports(student_id,month), assignment_students(student_id,valid_from,valid_to), audit(entity_type,entity_id,created_at), sessions(handle_hash) dan expires_at. Semua FK query sering diindeks.

## Migrasi dan seed
Database baru; jangan menjalankan SQL lama atau copy seed lama. Buat migrasi via CLI yang diverifikasi, satu perubahan domain logis per file, urutan: identities/roles/private -> academic -> assignments -> journals -> grades -> developments -> reports/audit. Pasang RLS/grants pada migrasi yang sama dengan tabel. Seed hanya nama sintetis Siswa Uji A/B, peran uji, tanpa password produksi. Backup sebelum perubahan hosted; rollback additive terlebih dahulu, jangan DROP otomatis. Retensi data akademik dan konselor masih terbuka; default tidak auto-delete, arsip. Expired sessions/idempotency dibersihkan rutin; rate-limit hash tidak disimpan selamanya.

Relasi/rationale: [architecture](./architecture.md), [decisions](./decisions.md). Uji: [testing](./testing.md).