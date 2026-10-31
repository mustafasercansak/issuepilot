# Güvenlik politikası

## Bir açık bildirmek

Güvenlik açıklarını herkese açık issue olarak değil, GitHub'ın özel bildirimi ile iletin: repo sayfasında **Security → Report a vulnerability**. Bildirimde etkilenen dosya veya akış, tekrar üretme adımları ve beklenen etki yer almalıdır. Gerçek token veya anahtar paylaşmayın.

Bu bir kişinin yürüttüğü bir projedir; belirli bir yanıt süresi garantisi verilmez.

## Kapsam

Özellikle şu alanlardaki sorunlar değerlidir:

- Yetkilendirme kapısının aşılması: `Agent::Allowed` ve `Status = Ready` koşullarının, `Agent::Rejected` önceliğinin veya tek aktif görev kuralının atlanması ([etiket protokolü](docs/label-protocol.md)).
- Issue veya repo içeriğinin komut gibi yorumlanması (prompt injection ile model davranışının sınırların dışına taşınması).
- Credential sızıntısı: API anahtarlarının, token'ların kaynak koda, loglara, issue günlüğüne veya üretilen dosyalara girmesi.
- Workflow izinlerinin gereğinden geniş olması veya üçüncü taraf action'ların sabitlenmemesi.

## Kapsam dışı

- Model çıktısının olgusal olarak yanlış olması. Çıktı her zaman insan incelemesinden geçer; otomatik merge yoktur.
- Kendi forkunuzdaki yanlış yapılandırma (eksik secret, yanlış izin).
- Üçüncü taraf hizmetlerin (GitHub, model sağlayıcıları) kendi açıkları.

## Bilinen sınırlar

- Kaynak toplama genel bir secret tarayıcısı değildir; kaynağa gömülü sırrı bulmayı garanti etmez ([AI workflow](docs/ai-workflow.md)).
- GitHub etiket ve PR işlemleri atomik değildir; son kontrol ile yazma arasında kısa bir yarış aralığı kalır.
- Issue günlüğü yorumları değiştirilebilir veya silinebilir; değişmez bir denetim kaydı değildir.
