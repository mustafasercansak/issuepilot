---
name: Repo envanteri
about: Repo yapısını kaynak dosyalara dayanarak belgele
title: "Projenin teknik envanterini çıkar"
---

## Görev

Repoyu inceleyerek `docs/repository-inventory.md` dosyasını oluştur.

## Beklenen içerik

- Projeler ve sorumlulukları
- Kullanılan diller, framework'ler ve doğrudan bağımlılıklar
- Build ve test komutları
- CI/CD workflow'ları
- Mevcut dokümantasyon dosyaları

## Kabul kriterleri

- [ ] Her bulgu ilgili repo dosyasına göreli bağlantı içerir.
- [ ] Tespit edilemeyen bilgiler açıkça belirtilir; tahminler gerçek gibi sunulmaz.
- [ ] Komutların belgelerden mi alındığı, gerçekten mi çalıştırıldığı belirtilir.
- [ ] Uygulama kodu değiştirilmez; değişiklik yalnızca envanter belgesindedir.
- [ ] Gizli değerler veya ortam değişkenlerinin değerleri rapora yazılmaz.
- [ ] Eksik belgeleri tamamlama bu görevin kapsamı dışındadır.
- [ ] Sonuç issue'ya bağlı bir PR olarak sunulur.

## Yetkilendirme

Görev hazır olduğunda bir insan `Agent::Allowed` etiketini ekler.
Bu şablon otomatik yetki vermez. Etiketlerin repoda önceden oluşturulması gerekir.
