# Blot. Database Table Printout

Generated: 2026-05-02T16:42:48.407Z
Driver: postgres
Sample rows per table: 3

Sensitive-ish fields are redacted in this report: `email`, `user_agent`, `referrer`, `payload`, `result_blob`.

## Table Summary

| Table | Rows | Columns |
|---|---:|---:|
| users | 57 | 4 |
| sessions | 57 | 6 |
| questions | 7 | 9 |
| choices | 63 | 7 |
| answers | 313 | 6 |
| result_mappings | 6 | 9 |
| results | 49 | 12 |
| perfumes | 167 | 9 |
| params | 1 | 7 |
| easter_eggs | 5 | 7 |
| site_copy | 1 | 3 |
| tracking_events | 348 | 5 |
| consent_log | 25 | 4 |

## Table Details

### users

Rows: 57

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | character varying | no |  |
| username | character varying | no |  |
| email | character varying | yes |  |
| created_at | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "u_-bjAR3k1Fh",
    "username": "m",
    "email": "[redacted]",
    "created_at": "2026-04-30T04:39:01.746Z"
  },
  {
    "id": "u_0JooQPY4CH",
    "username": "Sky",
    "email": "[redacted]",
    "created_at": "2026-05-02T08:50:31.585Z"
  },
  {
    "id": "u_1J_p6QY6GK",
    "username": "อายาโนะโคจิ",
    "email": "[redacted]",
    "created_at": "2026-04-27T14:45:36.995Z"
  }
]
```

### sessions

Rows: 57

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | character varying | no |  |
| user_id | character varying | no |  |
| started_at | timestamp with time zone | no | now() |
| completed_at | timestamp with time zone | yes |  |
| user_agent | character varying | yes |  |
| referrer | character varying | yes |  |

Sample rows (limit 3):

```json
[
  {
    "id": "s_-A0SX3ynBFkB",
    "user_id": "u_1J_p6QY6GK",
    "started_at": "2026-04-27T14:45:36.998Z",
    "completed_at": null,
    "user_agent": "[redacted]",
    "referrer": "[redacted]"
  },
  {
    "id": "s_-I85ZoXwbOOw",
    "user_id": "u_JUOWp7hgpn",
    "started_at": "2026-04-28T15:59:05.048Z",
    "completed_at": null,
    "user_agent": "[redacted]",
    "referrer": "[redacted]"
  },
  {
    "id": "s_10lk5ds6oMbj",
    "user_id": "u_v4g2TdcfhS",
    "started_at": "2026-04-29T04:02:44.680Z",
    "completed_at": "2026-04-29T04:02:44.727Z",
    "user_agent": "[redacted]",
    "referrer": "[redacted]"
  }
]
```

### questions

Rows: 7

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | character varying | no |  |
| sort_order | integer | no |  |
| title | character varying | no |  |
| subtitle | character varying | yes |  |
| image | character varying | yes |  |
| multi_select | boolean | no | false |
| created_at | timestamp with time zone | no | now() |
| updated_at | timestamp with time zone | no | now() |
| deleted_at | timestamp with time zone | yes |  |

Sample rows (limit 3):

```json
[
  {
    "id": "q0ZW17O",
    "sort_order": 6,
    "title": "เเนวเพลงที่ชอบฟัง",
    "subtitle": "Your playlist ",
    "image": null,
    "multi_select": true,
    "created_at": "2026-05-01T15:38:51.125Z",
    "updated_at": "2026-05-01T15:38:51.125Z",
    "deleted_at": null
  },
  {
    "id": "q1",
    "sort_order": 3,
    "title": "งบประมาณของคุณ",
    "subtitle": "What is your budget?",
    "image": null,
    "multi_select": false,
    "created_at": "2026-04-27T14:18:13.928Z",
    "updated_at": "2026-04-27T14:18:13.928Z",
    "deleted_at": null
  },
  {
    "id": "q2",
    "sort_order": 2,
    "title": "ช่วงอายุของคุณ",
    "subtitle": "What is your age range?",
    "image": null,
    "multi_select": false,
    "created_at": "2026-04-27T14:18:15.676Z",
    "updated_at": "2026-04-27T14:18:15.676Z",
    "deleted_at": null
  }
]
```

### choices

Rows: 63

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | nextval('choices_id_seq'::regclass) |
| question_id | character varying | no |  |
| code | character varying | no |  |
| label | character varying | no |  |
| image | character varying | yes |  |
| scores | jsonb | no | '{}'::jsonb |
| images | jsonb | no | '[]'::jsonb |

Sample rows (limit 3):

```json
[
  {
    "id": "207",
    "question_id": "q3",
    "code": "A",
    "label": "Casual",
    "image": "/outfits/q3-01-casual-women.png",
    "scores": {
      "Rich": -1,
      "Playful": 1,
      "Formality": -2,
      "Freshness": 1,
      "Intensity": -1
    },
    "images": [
      "/outfits/q3-01-casual-women.png",
      "/outfits/q3-01-casual-men.png"
    ]
  },
  {
    "id": "208",
    "question_id": "q3",
    "code": "B",
    "label": "Sport",
    "image": "/outfits/q3-02-sport-women.png",
    "scores": {
      "Time": 2,
      "Sport": 2,
      "Formality": -2,
      "Freshness": 2,
      "Masculine": 1
    },
    "images": [
      "/outfits/q3-02-sport-women.png",
      "/outfits/q3-02-sport-men.png"
    ]
  },
  {
    "id": "209",
    "question_id": "q3",
    "code": "C",
    "label": "Street",
    "image": "/outfits/q3-03-street-women.png",
    "scores": {
      "Sport": 1,
      "Modern": 2,
      "Playful": 1,
      "Formality": -2,
      "Intensity": 1
    },
    "images": [
      "/outfits/q3-03-street-women.png",
      "/outfits/q3-03-street-men.png"
    ]
  }
]
```

### answers

Rows: 313

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | nextval('answers_id_seq'::regclass) |
| session_id | character varying | no |  |
| question_id | character varying | no |  |
| question_order | integer | no |  |
| choice_code | character varying | no |  |
| answered_at | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "1",
    "session_id": "s_nyGHRdDwO1Vo",
    "question_id": "q1",
    "question_order": 1,
    "choice_code": "B",
    "answered_at": "2026-04-27T14:36:54.295Z"
  },
  {
    "id": "2",
    "session_id": "s_nyGHRdDwO1Vo",
    "question_id": "q2",
    "question_order": 2,
    "choice_code": "B",
    "answered_at": "2026-04-27T14:36:54.313Z"
  },
  {
    "id": "3",
    "session_id": "s_nyGHRdDwO1Vo",
    "question_id": "q3",
    "question_order": 3,
    "choice_code": "C",
    "answered_at": "2026-04-27T14:36:54.317Z"
  }
]
```

### result_mappings

Rows: 6

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | nextval('result_mappings_id_seq'::regclass) |
| pattern | character varying | no |  |
| fragrance | character varying | no |  |
| house | character varying | yes |  |
| family | character varying | yes |  |
| notes | jsonb | yes |  |
| blurb | text | yes |  |
| image | character varying | yes |  |
| updated_at | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "1",
    "pattern": "1B2B3C4D5B",
    "fragrance": "Montblanc Explorer",
    "house": "Montblanc",
    "family": "Woody Aromatic",
    "notes": [
      "Bergamot",
      "Vetiver",
      "Patchouli"
    ],
    "blurb": "ตัวอย่างจากสเปก — สำหรับคนที่ใช้ชีวิตในเมืองแต่ใจอยากเดินทาง กลิ่นไม้ผสมเครื่องเทศที่หรูแต่ไม่หนัก เหมาะกับ formal day-wear ที่ต้องการเสน่ห์แบบลึกลับ",
    "image": null,
    "updated_at": "2026-04-27T14:18:25.396Z"
  },
  {
    "id": "2",
    "pattern": "1A*3*4A5C",
    "fragrance": "Jo Malone English Pear & Freesia",
    "house": "Jo Malone London",
    "family": "Fruity Floral",
    "notes": [
      "Pear",
      "Freesia",
      "Patchouli"
    ],
    "blurb": "เฟรนลี่ สดใส ใส่แล้วเหมือนเดินในสวน — เหมาะกับงบประหยัดที่ยังอยากได้กลิ่นพรีเมียมระดับนานาชาติ",
    "image": null,
    "updated_at": "2026-04-27T14:18:25.678Z"
  },
  {
    "id": "3",
    "pattern": "1*2*3D4*5*",
    "fragrance": "Tom Ford Oud Wood",
    "house": "Tom Ford",
    "family": "Woody Oriental",
    "notes": [
      "Oud",
      "Sandalwood",
      "Vanilla"
    ],
    "blurb": "Formal · luxurious · timeless. กลิ่นไม้ตะวันออกที่เหมาะกับโอกาสสำคัญและคนที่ต้องการ presence ในห้องประชุม",
    "image": null,
    "updated_at": "2026-04-27T14:18:25.981Z"
  }
]
```

### results

Rows: 49

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | nextval('results_id_seq'::regclass) |
| session_id | character varying | no |  |
| pattern | character varying | no |  |
| fragrance | character varying | no |  |
| house | character varying | yes |  |
| family | character varying | yes |  |
| notes | jsonb | yes |  |
| blurb | text | yes |  |
| image | character varying | yes |  |
| email_sent | boolean | no | false |
| email_skipped | boolean | no | false |
| created_at | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "1",
    "session_id": "s_nyGHRdDwO1Vo",
    "pattern": "1B2B3C4D5J",
    "fragrance": "แนะนำให้เริ่มจากโรลออนก่อน 😅",
    "house": null,
    "family": "Easter Egg",
    "notes": [],
    "blurb": "เลือก \"เบียว\" + \"ไปเล่นการ์ด vangard\" — ระบบขอแนะนำให้เริ่มจากน้ำหอมแบบโรลออนก่อน พกง่าย ราคาเป็นมิตร แล้วค่อยอัปเกรดเมื่อเจอกลิ่นที่ใช่จริงๆ",
    "image": null,
    "email_sent": false,
    "email_skipped": false,
    "created_at": "2026-04-27T14:36:54.329Z"
  },
  {
    "id": "2",
    "session_id": "s_iKZ7FAyLocNv",
    "pattern": "1B2B3C4D5J",
    "fragrance": "แนะนำให้เริ่มจากโรลออนก่อน 😅",
    "house": null,
    "family": "Easter Egg",
    "notes": [],
    "blurb": "ระบบขอแนะนำให้เริ่มจากน้ำหอมแบบโรลออนก่อน พกง่าย ราคาเป็นมิตร นะคะนายท่าน",
    "image": null,
    "email_sent": false,
    "email_skipped": false,
    "created_at": "2026-04-27T14:51:16.991Z"
  },
  {
    "id": "3",
    "session_id": "s_gzp-rYHu4Vjt",
    "pattern": "1B2B3B4D5J",
    "fragrance": "คำตอบระดับ SSR!!!!!! ",
    "house": null,
    "family": "Easter Egg",
    "notes": [
      "มึงยังคาดหวังให้กูเขียน Note น้ำหอมอีกหร๊ออออออ"
    ],
    "blurb": "ระบบขอแนะนำให้เริ่มจากน้ำหอมแบบโรลออนก่อน พกง่าย ราคาเป็นมิตร นะคะนายท่าน โมเอะ โมเอะ บี๊มมมมมมมม",
    "image": null,
    "email_sent": false,
    "email_skipped": false,
    "created_at": "2026-04-27T14:54:24.129Z"
  }
]
```

### perfumes

Rows: 167

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | character varying | no |  |
| fragrance | character varying | no |  |
| house | character varying | yes |  |
| family | character varying | yes |  |
| notes | jsonb | no | '[]'::jsonb |
| blurb | text | yes |  |
| image | character varying | yes |  |
| dna | jsonb | no | '{}'::jsonb |
| updated_at | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "p_acqua_di_parma_colonia",
    "fragrance": "Acqua di Parma Colonia",
    "house": "Acqua di Parma",
    "family": "Citrus Aromatic",
    "notes": [
      "Bergamot",
      "Lemon",
      "Sweet Orange",
      "Lavender",
      "Rosemary",
      "Damask Rose",
      "Sandalwood",
      "Vetiver"
    ],
    "blurb": "เชิ๊ตขาวกับสเเลคเเบบสุภาพ เป็นดังไอหนุ่มอิตาลีที่เธอรัก",
    "image": "/bottles/acqua-di-parma.png",
    "dna": {
      "Rich": 5,
      "Sexy": 0,
      "Time": 6,
      "Sport": 3,
      "Luxury": 1,
      "Modern": 0,
      "Natural": 10,
      "Playful": 0,
      "Maturity": 2,
      "Formality": 2,
      "Freshness": 10,
      "Intensity": 0,
      "Masculine": 2,
      "Sweetness": 0
    },
    "updated_at": "2026-04-27T14:18:50.558Z"
  },
  {
    "id": "p_acqua_di_parma_fico_di_amari",
    "fragrance": "Acqua di Parma Fico di amari",
    "house": "Acqua di Parma",
    "family": "Citrus Floral",
    "notes": [
      "Bergamot",
      "Lemon",
      "Fig",
      "Cyclamen",
      "Cedarwood"
    ],
    "blurb": "กลิ่นชิลๆ สไตล์หนุ่ม อิตาลี ใส่เสื้อเชิ๊ต ขาสั้น เเละ Boat shoes เเต่กำลังขับเรือเฟอร์รี่",
    "image": "/bottles/acqua-di-parma.png",
    "dna": {
      "Rich": 5,
      "Sexy": 0,
      "Time": 4,
      "Sport": 1,
      "Luxury": 1,
      "Modern": 0,
      "Natural": 5,
      "Playful": 3,
      "Maturity": 0,
      "Formality": 0,
      "Freshness": 7,
      "Intensity": 0,
      "Masculine": -2,
      "Sweetness": 7
    },
    "updated_at": "2026-04-30T13:02:04.095Z"
  },
  {
    "id": "p_acqua_di_parma_fico_pandoro_di_silicio",
    "fragrance": "Acqua di Parma  Mandoro di silicia",
    "house": "Acqua di Parma",
    "family": "Citrus Aromatic",
    "notes": [
      "Bergamot",
      "Fig Leaves",
      "Pink Pepper",
      "Cedar",
      "Musk"
    ],
    "blurb": "กลิ่นหมาเเก่อิตาลี เเบบ bond ใน spy x family  อบอุ่น น่ากอดด เเอลมอนต์ หวานนิดๆ อบอุ่น หน่อยๆ",
    "image": "/bottles/acqua-di-parma.png",
    "dna": {
      "Rich": 5,
      "Sexy": 1,
      "Time": 5,
      "Sport": 3,
      "Luxury": 1,
      "Modern": 2,
      "Natural": 8,
      "Playful": 3,
      "Maturity": 1,
      "Formality": 0,
      "Freshness": 10,
      "Intensity": 2,
      "Masculine": 6,
      "Sweetness": 0
    },
    "updated_at": "2026-04-30T13:02:04.099Z"
  }
]
```

### params

Rows: 1

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | character varying | no |  |
| meta_weight | real | no | 0.5 |
| clamp_min | integer | no | '-10'::integer |
| clamp_max | integer | no | 10 |
| core | jsonb | no | '[]'::jsonb |
| meta | jsonb | no | '[]'::jsonb |
| updated_at | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "current",
    "meta_weight": 0.5,
    "clamp_min": -10,
    "clamp_max": 10,
    "core": "[{\"name\":\"Masculine\",\"label\":\"Masculine\",\"description\":\"+ มาส, − หวาน/ละมุน\"},{\"name\":\"Maturity\",\"label\":\"Maturity\",\"description\":\"+ ผู้ใหญ่/นิ่ง, − เด็ก/วัยรุ่น\"},{\"name\":\"Freshness\",\"label\":\"Freshness\",\"description\":\"+ สดชื่น, − หนัก/อบอุ่น\"},{\"name\":\"Sweetness\",\"label\":\"Sweetness\",\"description\":\"+ หวาน, − แห้ง/ขม\"},{\"name\":\"Intensity\",\"label\":\"Intensity\",\"description\":\"+ จัดจ้าน, − เบา\"},{\"name\":\"Formality\",\"label\":\"Formality\",\"description\":\"+ ทางการ, − ลำลอง\"},{\"name\":\"Time\",\"label\":\"Time\",\"description\":\"+ กลางวัน, − กลางคืน\"},{\"name\":\"Rich\",\"label\":\"Rich\",\"description\":\"+ เเพง ,- ราคาเข้าถึงได้\"},{\"name\":\"Sport\",\"label\":\"Sport\",\"description\":\"+ สปอร์ต,- ชิลสบายๆ\"},{\"name\":\"Natural\",\"lab... [truncated]",
    "meta": [
      {
        "name": "Modern",
        "label": "Modern",
        "description": "+ ทันสมัย, − คลาสสิก"
      },
      {
        "name": "Sexy",
        "label": "Sexy",
        "description": "+ เซ็กซี่, − สุภาพ"
      },
      {
        "name": "Luxury",
        "label": "Luxury",
        "description": "+ หรูหรา, − สบายๆ"
      },
      {
        "name": "Playful",
        "label": "Playful",
        "description": "+ สนุกขี้เล่น, − จริงจัง"
      }
    ],
    "updated_at": "2026-04-27T14:18:13.322Z"
  }
]
```

### easter_eggs

Rows: 5

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | character varying | no |  |
| label | character varying | no |  |
| enabled | boolean | no | true |
| priority | integer | no | 0 |
| constraints | jsonb | no | '{}'::jsonb |
| result | jsonb | no | '{}'::jsonb |
| updated_at | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "biew_vangard_rolon",
    "label": "เบียว + vangard → roll-on",
    "enabled": true,
    "priority": 100,
    "constraints": {
      "q1": null,
      "q2": null,
      "q3": "K",
      "q4": "D",
      "q5": "J",
      "q0ZW17O": "H"
    },
    "result": {
      "blurb": "ระบบขอแนะนำให้เริ่มจากเริ่มทาโรลออนหรือสารส้มก่อน พกง่าย ราคาเป็นมิตร โมเอะ โมเอะ บี๊มมมมมมมม <3",
      "house": "โรออนหรือสารส้มดี",
      "image": "https://i.postimg.cc/j29tmPmj/tao.jpg",
      "notes": [],
      "family": "",
      "fragrance": "คำตอบระดับ SSR!!!!!!  ยินดีต้อนรับกลับมาค่ะ นายท่าน "
    },
    "updated_at": "2026-04-27T14:19:25.944Z"
  },
  {
    "id": "egg_WHQqbLKL",
    "label": "รู้พิกัด",
    "enabled": true,
    "priority": 100,
    "constraints": {
      "q5": "A",
      "q0ZW17O": "B"
    },
    "result": {
      "blurb": "Younggu รู้พิกัดเมียมึงงง .... โดนเเน่ ",
      "house": "Already dead",
      "image": "https://i.postimg.cc/TY7WdxCn/Young-gu.png",
      "notes": [
        "โน๊ตพิกัดลงสมุดละตอนนี้"
      ],
      "family": "Easter Egg",
      "fragrance": "[คำตอบระดับ ภัยพิบัติ] กลับไปทำมาใหม่                 ยังกูรู้ \"พิกัด\" มึงละ"
    },
    "updated_at": "2026-05-02T05:04:02.260Z"
  },
  {
    "id": "egg_b62uIgNk",
    "label": "ขี้เยส",
    "enabled": true,
    "priority": 100,
    "constraints": {
      "q3": "F",
      "q4": "B",
      "q5": "A",
      "q0ZW17O": "C"
    },
    "result": {
      "blurb": "คำตอบระดับ SSR มึงมันไอ.....ขี้เยสสสสสสสสสสสส ",
      "house": "Perfume de maley",
      "image": "https://i.postimg.cc/T3DBddTK/layton.png",
      "notes": [
        "Apple",
        "Lavender",
        "bergamot",
        "Violet",
        "Woody tone"
      ],
      "family": "Easter Egg",
      "fragrance": "[คำตอบระดับ SSR] Perfume de maley layton"
    },
    "updated_at": "2026-05-02T04:49:41.781Z"
  }
]
```

### site_copy

Rows: 1

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | character varying | no |  |
| data | jsonb | no |  |
| updated_at | timestamp without time zone | no | CURRENT_TIMESTAMP |

Sample rows (limit 3):

```json
[
  {
    "id": "current",
    "data": "{\"home\":{\"lead\":\"เเค่บอกเราเกี่ยวกับคุณ เราจะสเปรย์ Blotter ให้คุณเอง\",\"title\":\"Found in a few dips.\",\"ctaPrimary\":\"Begin the dip →\",\"ctaSecondary\":\"How it works\"},\"quiz\":{\"email\":{\"body\":\"ใส่ email เพื่อรับน้ำหอมที่เราเลือกให้ พร้อมเหตุผลและตัวอย่างกลิ่นใกล้เคียง\",\"titleA\":\"Where shall we\",\"titleB\":\"send your match?\",\"ctaSkip\":\"Skip · ดูบนเว็บ\",\"eyebrow\":\"Step · Final / Send Result\",\"skipNote\":{\"body\":\"ไม่อยากรับ email ก็ได้ — กด Skip แล้วเราจะแสดงผลลัพธ์บนหน้าเว็บให้ทันที\",\"eyebrow\":\"Optional\"},\"backLabel\":\"← Edit my answers\",\"ctaSubmit\":\"Send my match →\",\"placeholder\":\"you@example.com\"},\"empty\":{\"body\":\"กรุณาให้ admin เพิ่มคำถามใน back office ก่อน\",\"title\":\"The quiz isn't ready yet.\",\"eye... [truncated]",
    "updated_at": "2026-04-28T20:11:38.324Z"
  }
]
```

### tracking_events

Rows: 348

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | nextval('tracking_events_id_seq'::regclass) |
| session_id | character varying | yes |  |
| type | character varying | no |  |
| payload | jsonb | yes |  |
| ts | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "1",
    "session_id": null,
    "type": "stage_view",
    "payload": "[redacted]",
    "ts": "2026-04-27T14:36:30.070Z"
  },
  {
    "id": "2",
    "session_id": null,
    "type": "stage_view",
    "payload": "[redacted]",
    "ts": "2026-04-27T14:36:32.015Z"
  },
  {
    "id": "3",
    "session_id": null,
    "type": "stage_view",
    "payload": "[redacted]",
    "ts": "2026-04-27T14:36:51.576Z"
  }
]
```

### consent_log

Rows: 25

Columns:

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | bigint | no | nextval('consent_log_id_seq'::regclass) |
| session_id | character varying | yes |  |
| consent | character varying | no |  |
| ts | timestamp with time zone | no | now() |

Sample rows (limit 3):

```json
[
  {
    "id": "1",
    "session_id": null,
    "consent": "accepted",
    "ts": "2026-04-27T14:36:21.647Z"
  },
  {
    "id": "2",
    "session_id": null,
    "consent": "accepted",
    "ts": "2026-04-27T14:36:21.928Z"
  },
  {
    "id": "3",
    "session_id": null,
    "consent": "accepted",
    "ts": "2026-04-28T10:22:11.587Z"
  }
]
```
