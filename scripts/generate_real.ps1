$ErrorActionPreference = 'Stop'
$TestProfile = $args[0]
$OutFile = $args[1]
$TrafficType = if ($args.Length -gt 2) { $args[2] } else { "ICMP" }

Write-Host "Generating capture for profile $TestProfile -> $OutFile (Traffic: $TrafficType)"

# Create network
docker network create ipsec-net --subnet=10.5.0.0/24 | Out-Null

try {
    # Create a temporary config for the initiator to replace %any with actual IPs
    $ConfPath = "$PSScriptRoot\..\tests\strongswan\${TestProfile}\ipsec.conf"
    $TempConfPath = "$PSScriptRoot\..\tests\strongswan\${TestProfile}\ipsec_initiator.conf"
    $content = Get-Content $ConfPath -Raw
    $content = $content -replace 'right=%any', 'right=10.5.0.10' -replace 'left=%any', 'left=10.5.0.11' -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($TempConfPath, $content, (New-Object System.Text.UTF8Encoding $False))

    # Start Left (Responder)
    docker run -d --name ipsec-left --net ipsec-net --ip 10.5.0.10 --privileged -v $PSScriptRoot\..\tests\strongswan\${TestProfile}\ipsec.conf:/etc/ipsec.d/ipsec.conf:ro -v $PSScriptRoot\..\tests\strongswan\${TestProfile}\ipsec.secrets2:/etc/ipsec.secrets:ro vimagick/strongswan:latest | Out-Null
    
    # Start Right (Initiator)
    docker run -d --name ipsec-right --net ipsec-net --ip 10.5.0.11 --privileged -v ${TempConfPath}:/etc/ipsec.d/ipsec.conf:ro -v $PSScriptRoot\..\tests\strongswan\${TestProfile}\ipsec.secrets2:/etc/ipsec.secrets:ro vimagick/strongswan:latest | Out-Null
    
    # Wait for them to settle
    Start-Sleep -Seconds 2

    # Start tcpdump in a third container attached to ipsec-left's network namespace
    docker run -d --name ipsec-sniffer --network container:ipsec-left -v ${PWD}:/data nicolaka/netshoot tcpdump -U -i any -w /data/$OutFile udp port 500 or udp port 4500 or esp | Out-Null
    
    Start-Sleep -Seconds 2

    # Trigger connection from Right to Left
    # Find connection name
    $ConnName = if ($TestProfile -eq "strong-profile") { "strong-tunnel" } else { "weak-tunnel" }
    
    # Wait a moment for ipsec to initialize on container start
    Start-Sleep -Seconds 3

    Write-Host "Bringing up connection $ConnName..."
    docker exec ipsec-right ipsec up $ConnName
    
    Write-Host "Generating $TrafficType ESP traffic..."
    if ($TrafficType -eq "ICMP") {
        docker exec ipsec-right ping -c 5 10.5.0.10
    } elseif ($TrafficType -eq "HTTP") {
        # Start a simple HTTP listener on the responder
        Start-Job { docker exec ipsec-left sh -c "echo -e 'HTTP/1.1 200 OK\r\n\r\nHello' | nc -l -p 80" } | Out-Null
        Start-Sleep -Seconds 1
        # Fetch it from the initiator
        docker exec ipsec-right wget -qO- http://10.5.0.10:80
    } elseif ($TrafficType -eq "DNS") {
        # Start a simple UDP listener on the responder
        Start-Job { docker exec ipsec-left sh -c "nc -l -u -p 53" } | Out-Null
        Start-Sleep -Seconds 1
        # Send a DNS query from the initiator
        docker exec ipsec-right nslookup example.com 10.5.0.10
    }
    
    Start-Sleep -Seconds 2
} finally {
    Write-Host "Cleaning up..."
    # Gracefully stop tcpdump so it flushes the pcap to disk
    docker kill --signal=SIGINT ipsec-sniffer | Out-Null
    Start-Sleep -Seconds 2
    
    docker rm -f ipsec-sniffer | Out-Null
    docker rm -f ipsec-left | Out-Null
    docker rm -f ipsec-right | Out-Null
    docker network rm ipsec-net | Out-Null
    if (Test-Path $TempConfPath) { Remove-Item $TempConfPath }
}
Write-Host "Done."
