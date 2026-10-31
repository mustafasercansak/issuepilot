# Katkı rehberi

Katkılar memnuniyetle karşılanır. Küçük, tek amaçlı değişiklikler en kolay incelenir.

## Başlamadan önce

- [Etiket protokolünü](docs/label-protocol.md) okuyun. Issue işleme akışına dokunan her değişiklik bu protokole uymalıdır.
- [AGENTS.md](AGENTS.md) projenin kesin kurallarını içerir. Özellikle: otomatik merge eklenmez, credential'lar kaynakta, logda veya üretilen dosyalarda yer almaz, çalıştırılmamış kontrol başarılı gösterilmez, uygulanmış davranış ile planlanan özellik karıştırılmaz.

## Geliştirme

Node.js 24 LTS ve npm gerekir.

```sh
npm ci
npm test
```

`npm test` önce derler (`tsc`), sonra `test/*.test.mjs` dosyalarını çalıştırır. Testler gerçek GitHub veya model API'sine bağlanmaz; ağ istekleri test içinde taklit edilir. Yeni davranış için test ekleyin; hata düzeltmesinde hatayı gösteren bir test ekleyin.

## Pull request

- Tek konu, tek PR. Başlık ne yaptığını söylesin.
- Açıklamada hangi kontrolleri **çalıştırdığınızı** ve hangilerini çalıştıramadığınızı yazın.
- Yeni bir ortam değişkeni veya secret ekliyorsanız `docs/` altında belgeleyin ve yalnızca adını yazın.
- PR'ı kendiniz merge etmeyin; merge kararı proje sahibindedir.

## Hata bildirimi

Hata için issue açarken sürümü (`git rev-parse --short HEAD`), çalıştırdığınız komutu ve çıktının ilgili kısmını ekleyin. Token ve anahtarları çıktıdan silin. Güvenlik açıkları için [SECURITY.md](SECURITY.md) dosyasına bakın.
