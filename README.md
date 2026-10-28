# IssuePilot

Issue, CI/CD hatası ve dokümantasyon eksiklerini inceleyip doğrulanmış PR hazırlamak için bağımsız proje.

Durum: GitHub üzerindeki mevcut issue okunabilir ve etiket uygunluğu kontrol edilir. Gemini ile tek envanter belgesi üretme, durum etiketleri ve PR açma akışı uygulanmıştır; gerçek API denemesi için secret eklenip etkinleştirilmesi gerekir.

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

Repo: https://github.com/mustafasercansak/issuepilot (private). Lisans henüz seçilmedi.

İlk pilot görevi: [repo envanteri](docs/first-issue.md). GitHub issue şablonu repoya eklenmiştir; AI envanter otomasyonu varsayılan olarak kapalıdır.

## GitHub issue okuma

```sh
npm start -- issue OWNER/REPO 123
```

Komut GitHub REST API üzerinden mevcut issue başlığını, açıklamasını ve etiketlerini okuyup JSON döndürür. Public repolar için token zorunlu değildir. Private repolarda gerekli issue okuma yetkisine sahip `GH_TOKEN` veya `GITHUB_TOKEN` ortam değişkenini kullanın.

Açık issue üzerinde `Agent::Allowed` ve yapılandırılmış Projects panosunda `Status = Ready` gerekir. `PROJECT_ID` ve `PROJECT_TOKEN` olmadan uygunluk verilmez. `Rejected`, `Working` ve `In-Review` işlemeyi engeller; PR kayıtları kabul edilmez. Needs-Human sonrasında insanın yeniden Allowed eklemesi uygunluğu geri açar. Bu kontrol salt okunurdur, görevi sahiplenmez ve eşzamanlı çalışmayı kilitlemez.

Çıkış kodları: 0 uygun, 1 uygun değil, 2 kullanım/API/bağlantı hatası.

Issue yorumları henüz okunmaz. Envanter AI job’ı ayrıca yapılandırılıp etkinleştirilir. `Agent::Allowed` eklendiğinde Issue intake workflow’u salt okunur uygunluk kontrolünü çalıştırır. Manuel çalıştırma da desteklenir. Kuyruktan görev seçimi henüz yoktur.

## Kontroller

```sh
npm test
```

Doğrudan JSON çıktısı için `node dist/cli.js issue OWNER/REPO 123` kullanın.

AI bağlantısının hedef akışı ve mevcut sınırlar: [AI workflow](docs/ai-workflow.md).

Ready kapısı ve pano erişimi: [kurulum](docs/ready-gate.md). Yalnızca Ready’ye taşıma, tarama açıkken 30 dakikalık kontrolde algılanır; Allowed etiket olayı hemen kontrol başlatır.
