package utils

import (
	"errors"
	"fmt"
	"net"
)

func incrementIP(i *net.IP) {
	ip := *i
	for n := len(ip) - 1; n >= 0; n-- {
		if ip[n] == 255 {
			ip[n] = 0
			continue
		}
		ip[n]++
		break
	}
}

func CIDRtoListIP(cidr string) ([]string, error) {
	ip, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, errors.New(fmt.Sprintf("Couldn't parse %s CIDR", cidr))
	}

	var IPs []string
	for ip := ip.Mask(ipNet.Mask); ipNet.Contains(ip); incrementIP(&ip) {
		IPs = append(IPs, ip.String())
	}
	return IPs, nil
}

func IsIPv6(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return false // not a valid IP address
	}
	return ip.To4() == nil // if To4() returns nil, it's not an IPv4 address, hence it's IPv6
}
