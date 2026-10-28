# IssuePilot

Issue, CI/CD hatası ve dokümantasyon eksiklerini inceleyip doğrulanmış PR hazırlamak için bağımsız proje.

Durum: GitHub üzerindeki mevcut issue okunabilir ve etiket uygunluğu kontrol edilir. AI çalıştırma, görev sahiplenme ve PR açma henüz uygulanmadı.

## Çalıştırma

Node.js 24 LTS ve npm gerekir. GitHub Actions ilk otomasyon ortamı olacaktır.


```sh
npm ci
npm run build
npm start -- --help
```

İlk hedef: `Agent::Allowed` etiketli issue → analiz → izole çalışma dalı → değişiklik → doğrulama → PR. Merge kararı insandadır.

Sonraki aşamalar CI hata analizi ve kodla karşılaştırmalı dokümantasyon denetimidir.

- [Etiket protokolü](docs/label-protocol.md)
- [Uygulama planı](docs/implementation-plan.md)

Henüz uzak repo oluşturulmadı ve lisans seçilmedi.

İlk pilot görevi: [repo envanteri](docs/first-issue.md). GitHub issue şablonu repoya eklenmiştir; otomasyon henüz uygulanmamıştır.

## GitHub issue okuma

```sh
npm start -- issue OWNER/REPO 123
```

Komut GitHub REST API üzerinden mevcut issue başlığını, açıklamasını ve etiketlerini okuyup JSON döndürür. Public repolar için token zorunlu değildir. Private repolarda gerekli issue okuma yetkisine sahip `GH_TOKEN` veya `GITHUB_TOKEN` ortam değişkenini kullanın.

Açık issue üzerinde `Agent::Allowed` gerekir. `Rejected`, `Working` ve `In-Review` işlemeyi engeller; PR kayıtları kabul edilmez. Needs-Human sonrasında insanın yeniden Allowed eklemesi uygunluğu geri açar. Bu kontrol salt okunurdur, görevi sahiplenmez ve eşzamanlı çalışmayı kilitlemez.

Çıkış kodları: 0 uygun, 1 uygun değil, 2 kullanım/API/bağlantı hatası.

Issue yorumları henüz okunmaz. `Agent::Allowed` eklendiğinde Issue intake workflow’u salt okunur uygunluk kontrolünü çalıştırır. Manuel çalıştırma da desteklenir. Kuyruktan görev seçimi henüz yoktur.

## Kontroller

```sh
npm test
```

Doğrudan JSON çıktısı için `node dist/cli.js issue OWNER/REPO 123` kullanın.
