# Uygulama planı

## 1. Salt okunur analiz

GitHub repo ve issue numarası alan CLI; issue içeriğini, etiketleri ve repo yönergelerini okur. Allowed kontrolü ve Rejected önceliğini uygular. İlk AI sağlayıcısıyla kod referanslı çözüm planı üretir. Bu aşamada dosya değiştirmez.

Kabul kriteri: Gerçek bir issue için plan üretir, yetkisiz issue işlemez, hataları açıkça bildirir.

## 2. Yerel düzeltme

Göreve özel izole checkout ve dal, tek görev sahipliği, süre/maliyet/deneme sınırları. Repo build/test komutlarıyla doğrulama. Bug görevlerinde mümkün olduğunda önce hatayı gösteren test.

Kabul kriteri: İncelenebilir diff ve gerçek kontrol çıktıları. Çalıştırılmamış kontroller başarılı gösterilmez.

## 3. GitHub Actions ve PR

Etiket olayıyla tetikleme, minimum token izinleri, durum geçişleri, tekrar olaylarını birleştirme, kesilen çalışma kurtarma politikası. Issue bağlantılı PR; yaklaşım, değişiklikler, testler ve doğrulanamayan noktalar açıklamada yer alır.

Kabul kriteri: Tek görev tek aktif PR üretir; Rejected tekrar denemeyi durdurur; otomatik merge yapılmaz.

AI komutları izole ortamda çalıştırılır. Issue ve repo içeriği güvenilmeyen girdidir. Anahtarlar kaynak kodda veya loglarda tutulmaz.

## 4. CI ve dokümantasyon

CI sorunlarını sınıflandırma; eksik veya eski belgeleri kod referanslarıyla raporlama; örnekleri ve bağlantıları doğrulama; mükerrer bulgulardan tekrar issue açılmasını önleme.

## Açık kararlar

İlk AI sağlayıcısı, lisans ve GitHub repo sahibi henüz seçilmedi. İlk entegrasyon GitHub; GitLab desteği sonraki kapsamdır.
