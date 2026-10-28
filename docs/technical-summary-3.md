# IssuePilot Teknik Özeti

Bu analiz, sağlanan dosya içerikleri üzerinde statik olarak gerçekleştirilmiştir:

*   **Proje Amacı:** Issue, CI/CD hataları ve dokümantasyon eksiklerini inceleyerek doğrulanmış Pull Request hazırlayan otonom bir sistemdir [README.md](../README.md).
*   **Teknik Gereksinimler:** Proje, Node.js 24 LTS ve `npm` kullanımını gerektirmektedir [README.md](../README.md), [package.json](../package.json).
*   **Paket Betikleri:** Proje içerisinde derleme için `npm run build`, başlatma için `npm start` ve test süreçleri için `npm test` komutları tanımlanmıştır [package.json](../package.json).
*   **Geliştirme Bağımlılıkları:** Proje, `@types/node` ve `typescript` paketlerini geliştirme bağımlılığı olarak kullanmaktadır [package.json](../package.json).
*   **CI Davranışı:** GitHub Actions üzerinde çalışan CI süreci, `npm ci` ile bağımlılıkları kurmakta ve `npm test` ile testleri çalıştırmaktadır [../.github/workflows/ci.yml](../.github/workflows/ci.yml).
*   **İş Akışı:** Sistem, GitHub issue'larını okuyarak `Agent::Allowed` etiketi ve `Status = Ready` durumu üzerinden analiz ve PR açma akışını yönetmektedir [README.md](../README.md).
*   **Çıktı Kontrolleri:** Sistem süreç sonunda `0` (uygun), `1` (uygun değil) veya `2` (hata) çıkış kodları üretmektedir [README.md](../README.md).

**Sınırlamalar:** Bu analiz, `docs/label-protocol.md`, `docs/implementation-plan.md`, `docs/first-issue.md`, `docs/ai-workflow.md`, `docs/ready-gate.md` ve `docs/recovery.md` dosyalarını kapsamamaktadır.
